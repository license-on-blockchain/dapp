import {getLicenseContract, getRootContract} from "./contractRetrieval";
import {handleUnknownEthereumError} from "../ErrorHandling";

// TODO: Only sign up for events once and call all observers locally

export class EthNotificationCenter {
    /**
     * @callback EthNotificationCenter~EventCallback
     * @param {*} issuing
     */

    /**
     * Callback is invoked every time a new issuance is created on this license contract. Callback gets issuance event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     */
    static onNewIssuing(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Issuing({}, {fromBlock: 'latest'}).watch((error, issuing) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(issuing.args.issuanceID);
        });
    }

    /**
     * Callback is invoked every time a license is transferred on this license contract. Callback gets transfer event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     */
    static onNewTransfer(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Transfer({}, {fromBlock: 'latest'}).watch((error, transfer) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(transfer);
        });
    }

    /**
     * Callback is invoked every time a license is reclaimed on this license contract. Callback gets reclaim event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     */
    static onNewReclaim(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Reclaim({}, {fromBlock: 'latest'}).watch((error, transfer) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(transfer);
        });
    }

    /**
     * Callback is invoked when the issuance with location is revoked.
     * @param {IssuanceLocation} issuanceLocation
     * @param {function()} callback
     */
    static onRevoke(issuanceLocation, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Revoke({issuanceID: issuanceLocation.issuanceID}, {fromBlock: 'latest'}).watch((error, revoke) => {
            if (error) { handleUnknownEthereumError(error); return; }
            if (revoke.args.issuanceID.toNumber() !== issuanceLocation.issuanceID) {
                return;
            }
            callback(revoke);
        });
    }

    /**
     * Callback is invoked every time a new license contract is created from this root contract. Callback get creation
     * event as argument.
     *
     * @param {string} rootContractAddress
     * @param {function(string, string)} callback
     */
    static onLicenseContractCreation(rootContractAddress, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.LicenseContractCreation({}, {fromBlock: 'latest'}).watch((error, creation) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(creation.args.licenseContractAddress, creation.transactionHash);
        });
    }
}