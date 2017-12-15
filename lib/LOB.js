import { ReactiveMap } from './ReactiveMap';
import { handleUnknownEthereumError } from "./ErrorHandling";
import { LazyReactiveVar } from "./LazyReactiveVar";
import { IssuanceLocation } from "./IssuanceLocation";
import { hexToBytes } from "./utils";
import { Balances } from "./lob/Balances";
import './init.js';
import {Transfer} from "./lob/Transfer";

const getAccounts = function(callback) {
    web3.eth.getAccounts(callback);
};

const __web3Calls = new Set();

function logWeb3Call(contractAddress, method, args = []) {
    const argsString = Object.entries(args).map(([key, value]) => {
        if (key) {
            return key + ": " + value;
        } else {
            return value;
        }
    }).join(", ");
    const s = contractAddress + "." + method + "(" + argsString + ")";
    if (__web3Calls.has(s)) {
        console.log("Duplicate execution: " + s);
    } else {
        __web3Calls.add(s);
    }
}

function injectWeb3LogCalls(contract, abiDescription) {
    for (const method of abiDescription) {
        if (method.type !== 'function') {
            continue;
        }

        const oldMethod = contract[method.name].call;

        contract[method.name].call = function() {
            const inputs = {};
            for (let i = 0; i < method.inputs.length; i++) {
                inputs[method.inputs[i].name] = arguments[i];
            }
            logWeb3Call(this.address, method.name, inputs);
            return oldMethod.apply(this, arguments);
        }
    }
}

const __licenseContracts = {};

/**
 * @param {string} address The address of the license contract
 * @returns {*} A web3 contract object
 */
function getLicenseContract(address) {
    if (typeof __licenseContracts[address] === 'undefined') {
        const abiDescription = [{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"balance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"reclaimableBalance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transferAndAllowReclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"}],"name":"revoke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuerName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newFee","type":"uint128"}],"name":"setFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"},{"name":"reclaimer","type":"address"}],"name":"reclaimableBalanceBy","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"signature","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerCertificate","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"originalOwner","type":"address"},{"name":"index","type":"uint256"}],"name":"addressesLicensesCanBeReclaimedFrom","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"liability","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"from","type":"address"},{"name":"amount","type":"uint64"}],"name":"reclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_signature","type":"bytes"}],"name":"sign","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"relevantIssuances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"originalOwner","type":"address"}],"name":"addressesLicensesCanBeReclaimedFromCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"relevantIssuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"certificateText","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lobRoot","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"safekeepingPeriod","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"numLicenses","type":"uint64"},{"name":"auditRemark","type":"string"},{"name":"auditTime","type":"uint32"},{"name":"initialOwner","type":"address"}],"name":"issueLicense","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"fee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"issuances","outputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"originalSupply","type":"uint64"},{"name":"auditTime","type":"uint32"},{"name":"auditRemark","type":"string"},{"name":"revoked","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_issuer","type":"address"},{"name":"_issuerName","type":"string"},{"name":"_liability","type":"string"},{"name":"_issuerCertificate","type":"bytes"},{"name":"_safekeepingPeriod","type":"uint8"},{"name":"_fee","type":"uint128"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Issuing","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"},{"indexed":false,"name":"reclaimable","type":"bool"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"}],"name":"Reclaim","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newFee","type":"uint128"}],"name":"FeeChange","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        const contract = abi.at(address, null);
        injectWeb3LogCalls(contract, abiDescription);
        __licenseContracts[address] = contract;
    }
    return __licenseContracts[address];
}

const __rootContracts = {};

/**
 * @param {string} address The address of the root contract
 * @returns {*} A web3 contract object
 */
function getRootContract(address) {
    if (typeof __rootContracts[address] === 'undefined') {
        const abiDescription = [{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdrawFromLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"newFee","type":"uint128"}],"name":"setLicenseContractFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"defaultFee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"licenseContractCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuerName","type":"string"},{"name":"liability","type":"string"},{"name":"safekeepingPeriod","type":"uint8"},{"name":"issuerCertificate","type":"bytes"}],"name":"createLicenseContract","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newDefaultFee","type":"uint128"}],"name":"setDefaultFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"}],"name":"disableLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"licenseContracts","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"licenseContractAddress","type":"address"}],"name":"LicenseContractCreation","type":"event"},{"anonymous":false,"inputs":[],"name":"Disabled","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        const contract = abi.at(address, null);
        injectWeb3LogCalls(contract, abiDescription);
        __rootContracts[address] = contract;
    }
    return __rootContracts[address];
}

// TODO: Only sign up for events once and call all observers locally
class EthNotificationCenter {
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
     * Callback is invoked every time a license is revoked on this license contract. Callback gets revoke event as
     * argument.
     * @param {string} licenseContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     */
    static onNewRevoke(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        // noinspection JSUnresolvedFunction
        licenseContract.Revoke({}, {fromBlock: 'latest'}).watch((error, revoke) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(revoke);
        });
    }

    /**
     * Callback is invoked every time a new license contract is created from this root contract. Callback get creation
     * event as argument.
     *
     * @param {string} rootContractAddress
     * @param {EthNotificationCenter~EventCallback} callback
     */
    static onLicenseContractCreation(rootContractAddress, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.LicenseContractCreation({}, {fromBlock: 'latest'}).watch((error, creation) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(creation.args.licenseContractAddress);
        });
    }
}

const __issuerNames = {};
function getIssuerName(licenseContractAddress, callback) {
    if (typeof __issuerNames[licenseContractAddress] !== 'undefined') {
        callback(__issuerNames[licenseContractAddress]);
    } else {
        getLicenseContract(licenseContractAddress).issuerName((error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            __issuerNames[licenseContractAddress] = value;
            callback(value);
        })
    }
}

const __sslCertificates = {};
function getSSLCertificate(licenseContractAddress, callback) {
    if (typeof __sslCertificates[licenseContractAddress] !== 'undefined') {
        callback(__sslCertificates[licenseContractAddress]);
    } else {
        lob.getIssuerCertificate(licenseContractAddress, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            value = hexToBytes(value);
            __sslCertificates[licenseContractAddress] = value;
            callback(value);
        });
    }
}

const __licenseContractSignatures = {};
function getLicenseContractSignature(licenseContractAddress, callback) {
    if (typeof __licenseContractSignatures[licenseContractAddress] !== 'undefined') {
        callback(__licenseContractSignatures[licenseContractAddress]);
    } else {
        lob.getSignature(licenseContractAddress, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            value = hexToBytes(value);
            __licenseContractSignatures[licenseContractAddress] = value;
            callback(value);
        });
    }
}

const __certificateTexts = {};
function getCertificateText(licenseContractAddress, callback) {
    if (typeof __certificateTexts[licenseContractAddress] !== 'undefined') {
        callback(__certificateTexts[licenseContractAddress]);
    } else {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.certificateText((error, text) => {
            if (error) { handleUnknownEthereumError(error); return; }
            __certificateTexts[licenseContractAddress] = text;
            callback(text);
        });
    }
}

export class LicenseContract {
    constructor(licenseContractAddress, issuerAddress) {
        this.address = licenseContractAddress;
        this.issuerAddress = issuerAddress;
        this.signature = new LazyReactiveVar(null, (callback) => {
            getLicenseContractSignature(this.address, callback);
        });
        this.issuerName = new LazyReactiveVar(null, (callback) => {
            getIssuerName(this.address, callback);
        });
        this.sslCertificate = new LazyReactiveVar(null, (callback) => {
            getSSLCertificate(this.address, callback);
        });
        this.certificateText = new LazyReactiveVar(null, (callback) => {
            getCertificateText(this.address, callback);
        });
        this.fee = new LazyReactiveVar(null, (callback) => {
            lob.getIssuingFee(this.address, (error, fee) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(fee);
            })
        });
    }
}

export class Issuance {
    /**
     * @param {IssuanceLocation} issuanceLocation
     */
    constructor(issuanceLocation) {
        this.issuanceLocation = issuanceLocation;
        this.description = new ReactiveVar("…");
        this.code = new ReactiveVar("…");
        this.originalOwner = new ReactiveVar("…");
        this.originalSupply = new ReactiveVar("…");
        this.auditTime = new ReactiveVar("…");
        this.auditRemark = new ReactiveVar("…");
        this.revoked = new ReactiveVar("…");
        this.issuerName = new LazyReactiveVar("…", (callback) => {
            getIssuerName(this.issuanceLocation.licenseContractAddress, callback);
        });
        this.sslCertificate = new LazyReactiveVar(null, (callback) => {
            getSSLCertificate(this.issuanceLocation.licenseContractAddress, callback);
        });
        this.signature = new LazyReactiveVar(null, (callback) => {
            getLicenseContractSignature(this.issuanceLocation.licenseContractAddress, callback);
        });
    }

    /**
     * @param {Array} rawIssuanceData Issuance data as provided by the `issuances` method on the license contract
     */
    mergeRawIssuanceData(rawIssuanceData) {
        this.description.set(rawIssuanceData[0]);
        this.code.set(rawIssuanceData[1]);
        this.originalOwner.set(rawIssuanceData[2]);
        this.originalSupply.set(rawIssuanceData[3]);
        this.auditTime.set(rawIssuanceData[4]);
        this.auditRemark.set(rawIssuanceData[5]);
        this.revoked.set(rawIssuanceData[6]);
    }
}

class LOB {
    constructor() {
        this._issuanceMetadata = {};
        this._ownedLicenseContracts = new ReactiveMap(() => {
            return new Set();
        });

        this.accounts = new LazyReactiveVar([], (callback) => {
            getAccounts((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(value);
            });
        });

        this.balances = new Balances();
        this.transfer = new Transfer();
    }

    /**
     * @param {string|string[]} addresses The address(es) for which relevant issuances shall be retrieved
     * @returns {IssuanceLocation[]}
     */
    getRelevantIssuanceLocations(addresses) {
        return this.balances.getRelevantIssuanceLocations(addresses);
    }

    /**
     * @param {string|string[]} addresses The address(es) for which all managed license contracts shall be returned
     * @return {LicenseContract[]} License contract objects managed by the given addresses
     */
    getManagedLicenseContracts(addresses) {
        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        const relevantIssuances = new Set();

        for (const address of addresses) {
            for (const relevantIssuance of this._ownedLicenseContracts.getKey(address)) {
                relevantIssuances.add(relevantIssuance);
            }
        }

        return Array.from(relevantIssuances);
    }

    /**
     * Invoke the callback once with every issuance ID under which `ownerAddress` may own licenses on the given license
     * contract.
     *
     * @param {string} licenseContractAddress
     * @param {string} ownerAddress
     * @param {function(number)} callback
     * @private
     */
    _forEachRelevantIssuanceID(licenseContractAddress, ownerAddress, callback) {
        // TODO: This could be cached and updated based on events. It's not urgent though since it's currently only called in watchLicenseContract
        const licenseContract = getLicenseContract(licenseContractAddress);
        const processedIssuanceIDs = new Set();
        // noinspection JSUnresolvedFunction
        licenseContract.relevantIssuancesCount(ownerAddress, (error, relevantIssuancesCount) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < relevantIssuancesCount; i++) {
                // noinspection JSUnresolvedFunction
                licenseContract.relevantIssuances(ownerAddress, i, (error, relevantIssuanceIDBigNumber) => {
                    // noinspection JSValidateTypes
                    /** @type Number */
                    const relevantIssuanceID = relevantIssuanceIDBigNumber.toNumber();
                    if (processedIssuanceIDs.has(relevantIssuanceID)) {
                        return; // Don't fetch the balance twice
                    }
                    processedIssuanceIDs.add(relevantIssuanceID);
                    callback(relevantIssuanceID);
                });
            }
        });
    }

    /**
     * Invoke the callback once for every address that `reclaimer` can reclaim licenses of the given location from. This
     * is an over-approximation and thus not all addresses returned by this may still have a borrowed balance.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {function(string)} callback Gets passed the address from which licenses may be reclaimed as parameter.
     * @private
     */
    _forEachReclaimableLicense(issuanceLocation, reclaimer, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);

        const handledAddresses = new Set();

        licenseContract.addressesLicensesCanBeReclaimedFromCount(issuanceLocation.issuanceID, reclaimer, (error, count) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < count.toNumber(); i++) {
                licenseContract.addressesLicensesCanBeReclaimedFrom(issuanceLocation.issuanceID, reclaimer, i, (error, reclaimableFromAddress) => {
                    if (error) { handleUnknownEthereumError(error); return; }
                    if (handledAddresses.has(reclaimableFromAddress)) {
                        return;
                    }
                    handledAddresses.add(reclaimableFromAddress);
                    callback(reclaimableFromAddress);
                });
            }
        });
    }

    watchLicenseContract(licenseContractAddress) {
        licenseContractAddress = licenseContractAddress.toLowerCase();
        const licenseContract = getLicenseContract(licenseContractAddress);

        licenseContract.issuer((error, issuerAddress) => {
            if (error) { handleUnknownEthereumError(error); return; }
            issuerAddress = issuerAddress.toLowerCase();
            this._ownedLicenseContracts.updateKey(issuerAddress, (set) => {
                set.add(new LicenseContract(licenseContractAddress, issuerAddress));
                return set;
            })
        });

        getAccounts((error, accounts) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (const address of accounts) {
                this._forEachRelevantIssuanceID(licenseContractAddress, address, (relevantIssuanceID) => {
                    const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, relevantIssuanceID);
                    this.balances.updateAllBalancesForIssuance(issuanceLocation);

                    this._forEachReclaimableLicense(issuanceLocation, address, (currentOwner) => {
                        this.balances.updateReclaimableBalance(issuanceLocation, address, currentOwner);
                    });
                });
            }

            EthNotificationCenter.onNewIssuing(licenseContractAddress, (issuanceID) => {
                this.balances.updateAllBalancesForIssuance(IssuanceLocation.fromComponents(licenseContractAddress, issuanceID));
            });

            EthNotificationCenter.onNewTransfer(licenseContractAddress, (transfer) => {
                const issuanceID = transfer.args.issuanceID.toNumber();
                const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, issuanceID);
                const from = transfer.args.from;
                const to = transfer.args.to;

                for (const address of [from, to]) {
                    if (accounts.indexOf(address) !== -1) { // Ignore if it doesn't affect us
                        this.balances.updateBalanceForIssuanceAndAddress(issuanceLocation, address);
                    }
                }
                if (transfer.args.reclaimable) {
                    if (accounts.indexOf(from) !== -1) {
                        this.balances.updateReclaimableBalance(issuanceLocation, from, to);
                    }
                }
            });

            EthNotificationCenter.onNewReclaim(licenseContractAddress, (reclaim) => {
                const issuanceID = reclaim.args.issuanceID.toNumber();
                const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, issuanceID);
                const from = reclaim.args.from;
                const to = reclaim.args.to;

                for (const address of [from, to]) {
                    if (accounts.indexOf(address) !== -1) { // Ignore if it doesn't affect us
                        this.balances.updateBalanceForIssuanceAndAddress(issuanceLocation, address);
                    }
                }

                if (accounts.indexOf(to) !== -1) {
                    this.balances.updateReclaimableBalance(issuanceLocation, to, from);
                }
            });

            // TODO: This does not work currently anyway
            // EthNotificationCenter.onNewRevoke(licenseContractAddress, (revoke) => {
            //     const issuanceID = revoke.args.issuanceID.toNumber();
            //     const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, issuanceID);
            //     if (this._watchedIssuances.hasKey(issuanceLocation)) {
            //         this._watchedIssuances.getKey(issuanceLocation).revoked.set(true);
            //     }
            // });
        });
    }

    watchRootContract(rootContractAddress) {
        const rootContract = getRootContract(rootContractAddress);

        rootContract.licenseContractCount((error, licenseContractCount) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < licenseContractCount.toNumber(); i++) {
                rootContract.licenseContracts(i, (error, licenseContractAddress) => {
                    if (error) { handleUnknownEthereumError(error); return; }
                    this.watchLicenseContract(licenseContractAddress);
                });
            }
        });

        EthNotificationCenter.onLicenseContractCreation(rootContractAddress, (creation) => {
            this.watchLicenseContract(creation.args.licenseContractAddress);
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {Issuance}
     */
    getIssuanceMetadata(issuanceLocation) {
        if (!this._issuanceMetadata[issuanceLocation]) {
            this._issuanceMetadata[issuanceLocation] = new Issuance(issuanceLocation);
            this._fetchIssuanceMetadata(issuanceLocation, (rawIssuanceData) => {
                this._issuanceMetadata[issuanceLocation].mergeRawIssuanceData(rawIssuanceData);
            });
        }
        return this._issuanceMetadata[issuanceLocation];
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {function(Array)} callback
     * @private
     */
    _fetchIssuanceMetadata(issuanceLocation, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        const issuanceID = issuanceLocation.issuanceID;
        licenseContract.issuances(issuanceID, (error, rawIssuanceData) => {
            if (error) { handleUnknownEthereumError(error); return; }

            callback(rawIssuanceData);
        });
    }

    getCertificateText(licenseContractAddress, callback) {
        // TODO: Make this method always call web3 and access the value using LicenseContract or Issuance
        getCertificateText(licenseContractAddress, (text) => {
            callback(null, text);
        });
    }

    getIssuerCertificate(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issuerCertificate(callback);
    }

    getSignature(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.signature(callback);
    }

    getIssuingFee(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.fee(callback);
    }

    computeBalanceSnapshots(transfers) {
        const snapshots = [];
        for (const transfer of transfers) {
            const lastSnapshot = snapshots[snapshots.length - 1] || {};
            const nextSnapshot = {...lastSnapshot};

            const {from, to, amount} = transfer.args;

            if (from !== "0x0000000000000000000000000000000000000000") {
                nextSnapshot[from] -= amount;
            }
            if (to !== "0x0000000000000000000000000000000000000000") {
                if (typeof nextSnapshot[to] === 'undefined') {
                    nextSnapshot[to] = 0;
                }
                nextSnapshot[to] += Number(amount);
            }

            snapshots.push(nextSnapshot);
        }
        return snapshots;
    }

    estimateGasCreateLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract.estimateGas(issuerName, liability, safekeepingPeriod, issuerCertificate, {from: issuerAddress}, callback);
    }

    /**
     * Create a new license contract under the given root contract
     * @param {string} rootContractAddress
     * @param {string} issuerAddress The address that shall be used to issue new licenses
     * @param {string} issuerName A human readable name of the person or organisation issuing the licenses
     * @param {string} liability A free text describing the liability the license issuer grants for his licenses
     * @param {number} safekeepingPeriod Number of years, purchasing records are kept by the issuer
     * @param {string} issuerCertificate A hex representation of a DER-encoded PKCS#12 certificate chain
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, gasPrice, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract(issuerName, liability, safekeepingPeriod, issuerCertificate, {from: issuerAddress, gasPrice}, callback);
    }

    estimateGasSignLicenseContract(licenseContractAddress, signature, from, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.sign.estimateGas(signature, {from}, callback);
    }

    signLicenseContract(licenseContractAddress, signature, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.sign(signature, {from, gasPrice}, callback)
    }

    estimateGasIssueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, fee, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense.estimateGas(description, code, initialOwnerName, amount, auditRemark, auditTime, initialOwnerAddress, {from, value: fee}, callback);
    }

    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, fee, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense(description, code, initialOwnerName, amount, auditRemark, auditTime, initialOwnerAddress, {from, gasPrice, value: fee}, callback);
    }
}

export const lob = new LOB();
