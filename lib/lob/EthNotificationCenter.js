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
        licenseContract.Issuing({}, {}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(event.args.issuanceID);
        });
    }

    /**
     * Callback is invoked every time a license is transferred on this license contract. Callback gets transfer event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     */
    static onNewTransfer(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Transfer({}, {fromBlock}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Normalise addresses in event
            event.args.from = event.args.from.toLowerCase();
            event.args.to = event.args.to.toLowerCase();
            callback(event);
        });
    }

    /**
     * Callback is invoked every time a license is reclaimed on this license contract. Callback gets reclaim event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     */
    static onNewReclaim(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Reclaim({}, {fromBlock}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Normalise addresses in event
            event.args.from = event.args.from.toLowerCase();
            event.args.to = event.args.to.toLowerCase();
            callback(event);
        });
    }

    /**
     * Callback is invoked when the issuance with location is revoked.
     * @param {IssuanceLocation} issuanceLocation
     * @param {function()} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     */
    static onRevoke(issuanceLocation, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Revoke({issuanceID: issuanceLocation.issuanceID}, {fromBlock}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            if (event.args.issuanceID.toNumber() !== issuanceLocation.issuanceID) {
                return;
            }
            callback(event);
        });
    }

    /**
     * Callback is invoked every time a new license contract is created from this root contract. Callback get creation
     * event as argument.
     *
     * @param {string} rootContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     */
    static onLicenseContractCreation(rootContractAddress, callback, fromBlock = 'latest') {
        const rootContract = getRootContract(rootContractAddress);
        // noinspection JSUnresolvedFunction
        rootContract.LicenseContractCreation({}, {fromBlock}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Normalise address in event
            event.args.licenseContractAddress = event.args.licenseContractAddress.toLowerCase();
            callback(event);
        });
    }

    /**
     * Callback is invoked when the given license contract is signed.
     *
     * @param {string} licenseContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     */
    static onLicenseContractSigning(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.Signing({}, {fromBlock}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(event);
        });
    }

    /**
     * Callback is invoked when the given license contract is disabled.
     *
     * @param {string} licenseContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     */
    static onLicenseContractDisabling(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.Disabling({}, {fromBlock}).watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(event);
        });
    }
}