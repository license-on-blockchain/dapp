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
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onNewIssuing(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        const eventHandle = licenseContract.Issuing({}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(event);
        });
        return eventHandle;
    }

    /**
     * Callback is invoked every time a license is transferred on this license contract. Callback gets transfer event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onNewTransfer(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        const eventHandle = licenseContract.Transfer({}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Normalise addresses in event
            event.args.from = event.args.from.toLowerCase();
            event.args.to = event.args.to.toLowerCase();
            callback(event);
        });
        return eventHandle;
    }

    /**
     * Callback is invoked every time a license is reclaimed on this license contract. Callback gets reclaim event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onNewReclaim(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        const eventHandle = licenseContract.Reclaim({}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Normalise addresses in event
            event.args.from = event.args.from.toLowerCase();
            event.args.to = event.args.to.toLowerCase();
            callback(event);
        });
        return eventHandle;
    }

    /**
     * Callback is invoked when the issuance with the given issuance ID is revoked.
     * @param {IssuanceID} issuanceID
     * @param {function()} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onRevoke(issuanceID, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        // noinspection JSUnresolvedFunction
        const eventHandle = licenseContract.Revoke({issuanceNumber: issuanceID.issuanceNumber}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            if (event.args.issuanceNumber.toNumber() !== issuanceID.issuanceNumber) {
                return;
            }
            callback(event);
        });
        return eventHandle;
    }

    /**
     * Callback is invoked every time a new license contract is created from this root contract. Callback get creation
     * event as argument.
     *
     * @param {string} rootContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onLicenseContractCreation(rootContractAddress, callback, fromBlock = 'latest') {
        const rootContract = getRootContract(rootContractAddress);
        // noinspection JSUnresolvedFunction
        const eventHandle = rootContract.LicenseContractCreation({}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Normalise address in event
            event.args.licenseContractAddress = event.args.licenseContractAddress.toLowerCase();
            callback(event);
        });
        return eventHandle;
    }

    /**
     * Callback is invoked when the given license contract is signed.
     *
     * @param {string} licenseContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onLicenseContractSigning(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        const eventHandle = licenseContract.Signing({}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(event);
        });
        return eventHandle;
    }

    /**
     * Callback is invoked when the given license contract is disabled.
     *
     * @param {string} licenseContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{stopWatching: function()}} A handle to stop watching if the event is of no more interest
     */
    static onLicenseContractDisabling(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        const eventHandle = licenseContract.Disabling({}, {fromBlock});
        eventHandle.watch((error, event) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(event);
        });
        return eventHandle;
    }
}