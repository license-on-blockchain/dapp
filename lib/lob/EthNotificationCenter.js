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
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onNewIssuing(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        return licenseContract.events.Issuing({fromBlock}).on('data', (event) => {
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }

    /**
     * Callback is invoked every time a license is transferred on this license contract. Callback gets transfer event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {string[]|null} accounts If not `null` only watch for transfers where the `to` or `from` address is
     *                                 present in this array. If `null`, watch all transfer events.
     * @param {EthNotificationCenter~EventCallback} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onNewTransfer(licenseContractAddress, accounts, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // TODO: Filter based on events
        // noinspection JSUnresolvedFunction
        return licenseContract.events.Transfer({fromBlock}).on('data', (event) => {
            // Normalise addresses in event
            event.returnValues.from = event.returnValues.from.toLowerCase();
            event.returnValues.to = event.returnValues.to.toLowerCase();
            if (accounts.indexOf(event.returnValues.from) === -1 && accounts.indexOf(event.returnValues.to) === -1) {
                return;
            }
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }

    /**
     * Callback is invoked every time a license is reclaimed on this license contract. Callback gets reclaim event
     * as argument.
     * @param {string} licenseContractAddress
     * @param {string[]|null} accounts If not `null` only watch for reclaims where the `to` or `from` address is present
     *                                 in this array. If `null`, watch all reclaim events.
     * @param {EthNotificationCenter~EventCallback} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onNewReclaim(licenseContractAddress, accounts, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        return licenseContract.events.Reclaim({fromBlock}).on('data', (event) => {
            // Normalise addresses in event
            event.returnValues.from = event.returnValues.from.toLowerCase();
            event.returnValues.to = event.returnValues.to.toLowerCase();
            if (accounts.indexOf(event.returnValues.from) === -1 && accounts.indexOf(event.returnValues.to) === -1) {
                return;
            }
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }

    /**
     * Callback is invoked when the issuance with the given issuance ID is revoked.
     * @param {IssuanceID} issuanceID
     * @param {function(*)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onRevoke(issuanceID, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        // noinspection JSUnresolvedFunction
        return licenseContract.events.Revoke({filter: {issuanceNumber: issuanceID.issuanceNumber}, fromBlock}).on('data', (event) => {
            if (event.returnValues.issuanceNumber.toNumber() !== issuanceID.issuanceNumber) {
                return;
            }
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }

    /**
     * Callback is invoked every time a new license contract is created from this root contract. Callback get creation
     * event as argument.
     *
     * @param {string} rootContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onLicenseContractCreation(rootContractAddress, callback, fromBlock = 'latest') {
        const rootContract = getRootContract(rootContractAddress);
        // noinspection JSUnresolvedFunction
        return rootContract.events.LicenseContractCreation({fromBlock}).on('data', (event) => {
            // Normalise address in event
            event.returnValues.licenseContractAddress = event.returnValues.licenseContractAddress.toLowerCase();
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }

    /**
     * Callback is invoked when the given license contract is signed.
     *
     * @param {string} licenseContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onLicenseContractSigning(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        return licenseContract.events.Signing({fromBlock}).on('data', (event) => {
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }

    /**
     * Callback is invoked when the given license contract is disabled.
     *
     * @param {string} licenseContractAddress
     * @param {function(string, string)} callback
     * @param {string|number} fromBlock The block from which on the events should be emitted onward
     * @returns {{unsubscribe: function(callback)}} A handle to stop watching if the event is of no more interest
     */
    static onLicenseContractDisabling(licenseContractAddress, callback, fromBlock = 'latest') {
        const licenseContract = getLicenseContract(licenseContractAddress);
        return licenseContract.events.Disabling({fromBlock}).on('data', (event) => {
            callback(event);
        }).on('error', handleUnknownEthereumError);
    }
}
