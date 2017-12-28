import {handleUnknownEthereumError} from "../ErrorHandling";
import {getLicenseContract} from "./contractRetrieval";
import {EthNotificationCenter} from "./EthNotificationCenter";

export class Issuances {
    constructor() {
        this._issuances = new Mongo.Collection('issuances', {connection: null});
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {Object}
     */
    getIssuance(issuanceLocation) {
        const query = {licenseContract: issuanceLocation.licenseContractAddress, issuanceID: issuanceLocation.issuanceID};
        if (!this._issuances.findOne(query)) {
            // If issuance has not been loaded yet, fetch it now
            this._fetchIssuanceMetadata(issuanceLocation, (data) => {
                this._issuances.insert(data);
                EthNotificationCenter.onRevoke(issuanceLocation, () => {
                    this._issuances.update(query, {revoked: true});
                });
            });
        }
        return this._issuances.findOne(query);
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