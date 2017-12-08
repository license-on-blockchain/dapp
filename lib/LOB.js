import { ReactiveMap } from './ReactiveMap';
import { handleUnknownEthereumError } from "./ErrorHandling";
import { LazyReactiveVar } from "./LazyReactiveVar";
import { IssuanceLocation } from "./IssuanceLocation";
import './init.js';

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
const __sslCertificates = {};
const __licenseContractSignatures = {};

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
            const licenseContractAddress = this.issuanceLocation.licenseContractAddress;
            if (typeof __issuerNames[licenseContractAddress] !== 'undefined') {
                callback(__issuerNames[licenseContractAddress]);
            } else {
                getLicenseContract(licenseContractAddress).issuerName((error, value) => {
                    if (error) { handleUnknownEthereumError(error); return undefined; }
                    __issuerNames[licenseContractAddress] = value;
                    callback(value);
                })
            }
        });
        this.sslCertificate = new LazyReactiveVar("…", (callback) => {
            const licenseContractAddress = this.issuanceLocation.licenseContractAddress;
            if (typeof __sslCertificates[licenseContractAddress] !== 'undefined') {
                callback(__sslCertificates[licenseContractAddress]);
            } else {
                lob.getIssuerCertificate(licenseContractAddress, (error, value) => {
                    if (error) { handleUnknownEthereumError(error); return undefined; }
                    __sslCertificates[licenseContractAddress] = value;
                    callback(value);
                });
            }
        });
        this.signature = new LazyReactiveVar("…", (callback) => {
            const licenseContractAddress = this.issuanceLocation.licenseContractAddress;
            if (typeof __licenseContractSignatures[licenseContractAddress] !== 'undefined') {
                callback(__licenseContractSignatures[licenseContractAddress]);
            } else {
                lob.getSignature(licenseContractAddress, (error, value) => {
                    if (error) { handleUnknownEthereumError(error); return undefined; }
                    __licenseContractSignatures[licenseContractAddress] = value;
                    callback(value);
                });
            }
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

export class Balance {
    constructor() {
        this._balance = new ReactiveMap(() => {
            return new BigNumber(0);
        });
        this._borrowedBalance = new ReactiveMap(() => {
            return new BigNumber(0);
        });
    }

    getOwnedBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        let balance = new BigNumber(0);
        for (const account of accounts) {
            const accountBalance = this._balance.getKey(account).minus(this._borrowedBalance.getKey(account));
            balance = balance.plus(accountBalance);
        }
        return balance;
    }

    getAllOwnedBalances(accounts) {
        const ownedBalances = [];
        for (const account of accounts) {
            ownedBalances.push([account, this.getOwnedBalance(account)]);
        }
        return ownedBalances;
    }

    getBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        let balance = new BigNumber(0);
        for (const account of accounts) {
            balance = balance.plus(this._balance.getKey(account));
        }
        return balance;
    }

    getBorrowedBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        let balance = new BigNumber(0);
        for (const account of accounts) {
            balance = balance.plus(this._borrowedBalance.getKey(account));
        }
        return balance;
    }

    setBalance(account, newBalance) {
        this._balance.setKey(account, newBalance);
    }

    setBorrowedBalance(account, newBalance) {
        this._borrowedBalance.setKey(account, newBalance);
    }
}

class LOB {
    constructor() {
        this._watchedIssuances = new ReactiveMap(() => {
            return new Balance();
        });
        /// address => Set<IssuanceLocation>
        this._relevantIssuances = new ReactiveMap(() => {
            return new Set();
        });
        this._issuanceMetadata = {};
        this._certificateTexts = {};

        // Original owner => IssuanceLocation => Current owner => Int
        this._openReclaims = new ReactiveMap(() => {
            // IssuanceLocation => Current owner => Int
            return new ReactiveMap(() => {
                // Current owner => ReactiveVar<Int>
                return new ReactiveMap(() => {
                    return new ReactiveVar(0);
                });
            });
        });

        this.accounts = new LazyReactiveVar([], (callback) => {
            getAccounts((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(value);
            });
        });
    }

    /**
     * @param {string|string[]} addresses The address(es) for which relevant issuances shall be retrieved
     * @returns {IssuanceLocation[]}
     */
    getRelevantIssuanceLocations(addresses) {
        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        const relevantIssuances = new Set();

        for (const address of addresses) {
            for (const relevantIssuance of this._relevantIssuances.getKey(address)) {
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

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {Balance} A balances object
     */
    getBalances(issuanceLocation) {
        return this._watchedIssuances.getKey(issuanceLocation);
    }

    watchLicenseContract(licenseContractAddress) {
        licenseContractAddress = licenseContractAddress.toLowerCase();

        getAccounts((error, accounts) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (const address of accounts) {
                this._forEachRelevantIssuanceID(licenseContractAddress, address, (relevantIssuanceID) => {
                    const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, relevantIssuanceID);
                    this._updateAllBalancesForIssuance(issuanceLocation);

                    this._forEachReclaimableLicense(issuanceLocation, address, (currentOwner) => {
                        this._updateReclaimableBalance(issuanceLocation, address, currentOwner);
                    });
                });
            }

            EthNotificationCenter.onNewIssuing(licenseContractAddress, (issuanceID) => {
                this._updateAllBalancesForIssuance(IssuanceLocation.fromComponents(licenseContractAddress, issuanceID));
            });

            EthNotificationCenter.onNewTransfer(licenseContractAddress, (transfer) => {
                const issuanceID = transfer.args.issuanceID.toNumber();
                const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, issuanceID);
                const from = transfer.args.from;
                const to = transfer.args.to;

                for (const address of [from, to]) {
                    if (accounts.indexOf(address) !== -1) { // Ignore if it doesn't affect us
                        this.updateBalance(issuanceLocation, address);
                    }
                }
                if (transfer.args.reclaimable) {
                    if (accounts.indexOf(from) !== -1) {
                        this._updateReclaimableBalance(issuanceLocation, from, to);
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
                        this.updateBalance(issuanceLocation, address);
                    }
                }

                if (accounts.indexOf(to) !== -1) {
                    this._updateReclaimableBalance(issuanceLocation, to, from);
                }
            });

            EthNotificationCenter.onNewRevoke(licenseContractAddress, (revoke) => {
                const issuanceID = revoke.args.issuanceID.toNumber();
                const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, issuanceID);
                if (this._watchedIssuances.hasKey(issuanceLocation)) {
                    this._watchedIssuances.getKey(issuanceLocation).revoked.set(true);
                }
            });
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
     * Update the number of licenses `originalOwner` can reclaim from `currentOwner` and store the value in
     * `_openReclaims`.
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} originalOwner
     * @param {string} currentOwner
     * @private
     */
    _updateReclaimableBalance(issuanceLocation, originalOwner, currentOwner) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaimableBalanceBy(issuanceLocation.issuanceID, currentOwner, originalOwner, (error, reclaimableBalance) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._openReclaims.updateKey(originalOwner, (issuanceLocationMap) => {
                issuanceLocationMap.updateKey(issuanceLocation, (currentOwnerMap) => {
                    currentOwnerMap.updateKey(currentOwner, (balance) => {
                        balance.set(reclaimableBalance.toNumber());
                        return balance;
                    });
                    return currentOwnerMap;
                });
                return issuanceLocationMap;
            });
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @private
     */
    _updateAllBalancesForIssuance(issuanceLocation) {
        getAccounts((error, accounts) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Retrieve initial balances. If a balance is non-zero and metadata is missing, metadata will be retrieved
            for (const address of accounts) {
                this.updateBalance(issuanceLocation, address);
            }
        });
    }

    updateBalance(issuanceLocation, accountAddress) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);

        this._relevantIssuances.updateKey(accountAddress, (oldValue) => {
            oldValue.add(issuanceLocation);
            return oldValue;
        });

        licenseContract.balance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) { handleUnknownEthereumError(error); return; }

            this._watchedIssuances.updateKey(issuanceLocation, (issuance) => {
                issuance.setBalance(accountAddress, balance);
                return issuance;
            });
        });

        licenseContract.reclaimableBalance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) { handleUnknownEthereumError(error); return; }

            this._watchedIssuances.updateKey(issuanceLocation, (issuance) => {
                issuance.setBorrowedBalance(accountAddress, balance);
                return issuance;
            });
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

    transferLicense(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        return licenseContract.transfer(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, callback);
    }

    estimateGasTransferLicense(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transfer.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

    transferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        return licenseContract.transferAndAllowReclaim(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, callback);
    }

    estimateGasTransferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transferAndAllowReclaim.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

    /**
     * Perform the `reclaim` smart contract method.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    reclaim(issuanceLocation, reclaimer, from, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaim(issuanceLocation.issuanceID, from, amount, { from: reclaimer, gasPrice }, callback);
    }

    /**
     * Estimate the gas consumption for the `reclaim` smart contract method.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {function(*, number)} callback
     */
    estimateGasReclaim(issuanceLocation, reclaimer, from, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaim.estimateGas(issuanceLocation.issuanceID, from, amount, { from: reclaimer }, callback);
    }

    getCertificateText(licenseContractAddress, callback) {
        if (typeof this._certificateTexts[licenseContractAddress] !== 'undefined') {
            callback(null, this._certificateTexts[licenseContractAddress]);
        } else {
            const licenseContract = getLicenseContract(licenseContractAddress);
            licenseContract.certificateText((error, text) => {
                if (!error) {
                    this._certificateTexts[licenseContractAddress] = text;
                }
                callback(error, text);
            });
        }
    }

    getIssuerCertificate(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issuerCertificate(callback);
    }

    getSignature(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.signature(callback);
    }

    /**
     * Get all license transfer and reclaim events for the given issuance location.
     * @param {IssuanceLocation} issuanceLocation
     * @param {function(error, events)} callback
     */
    getLicenseTransfers(issuanceLocation, callback) {
        const licenseContractAddress = issuanceLocation.licenseContractAddress;
        const issuanceID = issuanceLocation.issuanceID;
        const licenseContract = getLicenseContract(licenseContractAddress);
        const transfersP = new Promise((resolve, reject) => {
            licenseContract.Transfer({issuanceID}, {fromBlock: 0}).get((error, transfers) => {
                if (error) {
                    reject(error);
                    return;
                }
                transfers = transfers.filter((transfer) => transfer.args.issuanceID.equals(issuanceID));
                resolve(transfers);
            });
        });
        const reclaimsP = new Promise((resolve, reject) => {
            licenseContract.Reclaim({issuanceID}, {fromBlock: 0}).get((error, reclaims) => {
                if (error) {
                    reject(error);
                    return;
                }
                reclaims = reclaims.filter((transfer) => transfer.args.issuanceID.equals(issuanceID));
                resolve(reclaims);
            });
        });
        Promise.all([transfersP, reclaimsP])
            .then(([transfers, reclaims]) => {
                const merged = transfers.concat(reclaims);
                merged.sort((lhs, rhs) => {
                    if (lhs.blockNumber !== rhs.blockNumber) {
                        return lhs.blockNumber - rhs.blockNumber;
                    } else {
                        return lhs.transactionIndex - rhs.transactionIndex;
                    }
                });
                callback(null, merged)
            })
            .catch((error) => {
                callback(error, null)
            });
    }

    getIssuanceLocationsForWhichReclaimsArePossible(addresses) {
        const issuanceLocations = new Set();

        for (const address of addresses) {
            const merge = Object.keys(this._openReclaims.getKey(address).get());
            for (const issuanceLocation of merge) {
                issuanceLocations.add(IssuanceLocation.fromString(issuanceLocation));
            }
        }

        return issuanceLocations;
    }

    /**
     * Get the addresses from which licenses of the given issuance location may be reclaimed from by the given reclaimer.
     * This is an over-approximation and thus not all addresses given here may still own licenses that can be reclaimed.
     *
     * @param {IssuanceLocation} issuanceLocation The issuance location of which licenses shall be reclaimed
     * @param {string} reclaimer The address that wants to reclaim licenses
     * @returns {Array} Addresses to which licenses were given with the right to reclaim them.
     */
    getReclaimOrigins(issuanceLocation, reclaimer) {
        return Object.keys(this._openReclaims.getKey(reclaimer).getKey(issuanceLocation).get())
    }

    /**
     * Get the number of licenses of the given location that the addresses can collectively reclaim.
     *
     * @param {IssuanceLocation} issuanceLocation The issuance for which the reclaimable balance shall be computed.
     * @param {string[]|string} addresses The address(es) that can collectively reclaim licenses.
     * @returns {number} The number of licenses that can collectively be reclaimed by the addresses.
     */
    getReclaimableBalance(issuanceLocation, addresses) {
        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        let balance = 0;
        for (const address of addresses) {
            balance += Object.entries(this._openReclaims.getKey(address).getKey(issuanceLocation).get())
                .map(([key, value]) => value.get())
                .reduce((a, b) => a + b, 0);
        }
        return balance;
    }

    /**
     * Return the number of licenses of the given location that `reclaimer` can reclaim from `currentOwner`.
     *
     * @param {IssuanceLocation} issuanceLocation The issuance for which licenses shall be reclaimed
     * @param {string} reclaimer The address that wants to reclaim licenses
     * @param {string} currentOwner The address from which the licenses shall be reclaimed
     * @returns {number} The number of licenses `reclaimer` can reclaim from `currentOwner`
     */
    getReclaimableBalanceFrom(issuanceLocation, reclaimer, currentOwner) {
        return this._openReclaims.getKey(reclaimer).getKey(issuanceLocation).getKey(currentOwner);
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
}

export const lob = new LOB();
web3.lob = lob;
