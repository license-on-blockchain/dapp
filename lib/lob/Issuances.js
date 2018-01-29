import {handleUnknownEthereumError} from "../ErrorHandling";
import {getLicenseContract} from "./contractRetrieval";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {IssuanceID} from "../IssuanceID";

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
        for (let issuanceNumber = 0; issuanceNumber < issuancesCount; issuanceNumber++) {
            // Fetch issuance if it is not present in the database
            this.getIssuance(IssuanceID.fromComponents(licenseContractAddress, issuanceNumber));
        }
        const query = {licenseContract: licenseContractAddress};
        if (onlyNonRevoked) {
            query.revoked = false;
        }
        return this._issuances.find(query, {sort: {issuanceNumber: 1}});
    }

    /**
     * @param {IssuanceID} issuanceID
     * @returns {{licenseContract: string, issuanceNumber: number, description: string, code: string, originalSupply: number, auditTime: number, auditRemark: string, revoked: boolean, revocationReason: string}}
     */
    getIssuance(issuanceID) {
        const issuance = this._issuances.findOne({_id: issuanceID.toString()});
        if (!issuance && !this._fetchInProgress.has(issuanceID)) {
            this._fetchInProgress.add(issuanceID);
            // If issuance has not been loaded yet, fetch it now
            this._fetchIssuanceMetadata(issuanceID, (data) => {
                data._id = issuanceID.toString();
                this._fetchInProgress.delete(issuanceID);
                this._issuances.insert(data);
                const eventHandle = EthNotificationCenter.onRevoke(issuanceID, () => {
                    this._issuances.update({_id: issuanceID.toString()}, {$set: {revoked: true}});
                    eventHandle.stopWatching((error) => {
                        if (error) { handleUnknownEthereumError(error); }
                    });
                });
            });
        }
        return issuance;
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {function(Object)} callback
     * @private
     */
    _fetchIssuanceMetadata(issuanceID, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        const issuanceNumber = issuanceID.issuanceNumber;
        licenseContract.issuances(issuanceNumber, (error, rawIssuanceData) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback({
                licenseContract: issuanceID.licenseContractAddress,
                issuanceNumber: issuanceID.issuanceNumber,
                description: rawIssuanceData[0],
                code: rawIssuanceData[1],
                originalSupply: rawIssuanceData[2].toNumber(),
                auditTime: rawIssuanceData[3].toNumber(),
                auditRemark: rawIssuanceData[4],
                revoked: rawIssuanceData[5],
                revocationReason: rawIssuanceData[6],
            });
        });
    }

    /**
     * Validates if the given issuance ID is valid or has any problems that may indicate fraud. This includes invalid
     * SSL certificates, invalid signatures, revoked licenses and control take over of the license contract by the root
     * contract's owner
     * @param {IssuanceID} issuanceID
     *
     * @returns {string|null} The error message or `null` if validation succeeded
     */
    getValidationError(issuanceID) {
        const signatureValidationError = this.licenseContracts.getSignatureValidationError(issuanceID.licenseContractAddress);
        if (signatureValidationError) {
            return signatureValidationError;
        }
        const issuance = this.getIssuance(issuanceID);
        if (issuance && issuance.revoked) {
            return TAPi18n.__("issuanceValidationError.issuance_revoked");
        }
        if (this.licenseContracts.getManagerAddress(issuanceID.licenseContractAddress)) {
            return TAPi18n.__("issuanceValidationError.management_takeover");
        }
        return null;
    }
}