import {handleUnknownEthereumError} from "../ErrorHandling";
import {getLicenseContract} from "./contractRetrieval";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {IssuanceID} from "../IssuanceID";
import {PersistentCollections} from "../PersistentCollections";

export class Issuances {
    /**
     * @param {LicenseContracts} licenseContractsSubmodule
     */
    constructor(licenseContractsSubmodule) {
        this._issuances = PersistentCollections.issuances;
        this.licenseContracts = licenseContractsSubmodule;
        this._fetchInProgress = new Set();
        // IDs of the issuances that have been refreshed since the last launch.
        // Until they are refreshed, old values can be shown but we need to reload all values to check if the issuance
        // has been revoked.
        this._upToDateIssuances = new Set();
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
        if ((!issuance || !this._upToDateIssuances.has(issuanceID)) && !this._fetchInProgress.has(issuanceID)) {
            this._fetchInProgress.add(issuanceID);
            // If issuance has not been loaded yet, fetch it now
            this._fetchIssuanceMetadata(issuanceID, (data) => {
                this._upToDateIssuances.add(issuanceID);
                this._fetchInProgress.delete(issuanceID);
                this._issuances.upsert({_id: issuanceID.toString()}, {$set: data});
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

    setInternalComment(issuanceID, comment) {
        this._issuances.upsert({_id: issuanceID.toString()}, {$set: {
            internalComment: comment
        }});
    }

    /**
     * Retrieve the date at which the issuance has been revoked. If the date has not been loaded or the issuance has not
     * been revoked, `null` is returned.
     *
     * @param {IssuanceID} issuanceID
     * @return {Date|null}
     */
    getRevokeDate(issuanceID) {
        const query = {
            _id: issuanceID.toString(),
            revokeDate: {$exists: true}
        };
        const cachedValue = this._issuances.findOne(query);
        if (cachedValue) {
            return new Date(cachedValue.revokeDate * 1000);
        } else {
            const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
            // TODO: Update to 1.0
            licenseContract.getPastEvents('Revoke', {filter: {issuanceNumber: issuanceID.issuanceNumber}, fromBlock: 0}).then((events) => {
                if (events.length > 0) {
                    const blockNumber = events[0].blockNumber;
                    web3.eth.getBlock(blockNumber).then((block) => {
                        this._issuances.update({_id: issuanceID.toString()}, {$set: {
                            revokeDate: block.timestamp
                        }});
                    }).catch(handleUnknownEthereumError);
                }
            }).catch(handleUnknownEthereumError);
            return null;
        }
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {function(Object)} callback
     * @private
     */
    _fetchIssuanceMetadata(issuanceID, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        const issuanceNumber = issuanceID.issuanceNumber;
        licenseContract.methods.issuances(issuanceNumber).call().then((rawIssuanceData) => {
            callback({
                licenseContract: issuanceID.licenseContractAddress,
                issuanceNumber: issuanceID.issuanceNumber,
                description: rawIssuanceData[0],
                code: rawIssuanceData[1],
                originalSupply: Number(rawIssuanceData[2]),
                auditTime: Number(rawIssuanceData[3]),
                auditRemark: rawIssuanceData[4],
                revoked: rawIssuanceData[5],
                revocationReason: rawIssuanceData[6],
            });
        }).catch(handleUnknownEthereumError);
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
