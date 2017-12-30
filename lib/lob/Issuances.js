import {handleUnknownEthereumError} from "../ErrorHandling";
import {getLicenseContract} from "./contractRetrieval";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {IssuanceLocation} from "../IssuanceLocation";

export class Issuances {
    /**
     * @param {LicenseContracts} licenseContractsSubmodule
     */
    constructor(licenseContractsSubmodule) {
        this._issuances = new Mongo.Collection('issuances', {connection: null});
        this.licenseContracts = licenseContractsSubmodule;
        this._fetchInProgress = new Set();
    }

    /**
     * @param {string} licenseContractAddress
     * @param {boolean} onlyNonRevoked
     * @return {Mongo.Cursor}
     */
    getIssuancesOfLicenseContract(licenseContractAddress, onlyNonRevoked = false) {
        const issuancesCount = this.licenseContracts.getIssuancesCount(licenseContractAddress);
        for (let issuanceID = 0; issuanceID < issuancesCount; issuanceID++) {
            // Fetch issuance if it is not present in the database
            this.getIssuance(IssuanceLocation.fromComponents(licenseContractAddress, issuanceID));
        }
        const query = {licenseContract: licenseContractAddress};
        if (onlyNonRevoked) {
            query.revoked = false;
        }
        return this._issuances.find(query, {sort: {issuanceID: 1}});
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {{licenseContract: string, issuanceID: number, description: string, code: string, originalOwner: string, originalSupply: number, auditTime: number, auditRemark: string, revoked: boolean}}
     */
    getIssuance(issuanceLocation) {
        const query = {licenseContract: issuanceLocation.licenseContractAddress, issuanceID: issuanceLocation.issuanceID};
        const issuance = this._issuances.findOne(query);
        if (!issuance && !this._fetchInProgress.has(issuanceLocation)) {
            this._fetchInProgress.add(issuanceLocation);
            // If issuance has not been loaded yet, fetch it now
            this._fetchIssuanceMetadata(issuanceLocation, (data) => {
                this._fetchInProgress.delete(issuanceLocation);
                this._issuances.insert(data);
                EthNotificationCenter.onRevoke(issuanceLocation, () => {
                    this._issuances.update(query, {$set: {revoked: true}});
                });
            });
        }
        return issuance;
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {function(Object)} callback
     * @private
     */
    _fetchIssuanceMetadata(issuanceLocation, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        const issuanceID = issuanceLocation.issuanceID;
        licenseContract.issuances(issuanceID, (error, rawIssuanceData) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback({
                licenseContract: issuanceLocation.licenseContractAddress,
                issuanceID: issuanceLocation.issuanceID,
                description: rawIssuanceData[0],
                code: rawIssuanceData[1],
                originalOwner: rawIssuanceData[2],
                originalSupply: rawIssuanceData[3].toNumber(),
                auditTime: rawIssuanceData[4].toNumber(),
                auditRemark: rawIssuanceData[5],
                revoked: rawIssuanceData[6],
            });
        });
    }
}