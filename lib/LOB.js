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
    const s = contractAddress + "." + method + "(" + args.join(", ") + ")";
    if (__web3Calls.has(s)) {
        console.log("Duplicate execution: " + s);
    } else {
        __web3Calls.add(s);
    }
}

const __licenseContracts = {};

/**
 * @param {string} address The address of the license contract
 * @returns {*} A web3 contract object
 */
function getLicenseContract(address) {
    if (typeof __licenseContracts[address] === 'undefined') {
        const abiDescription = [{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"balance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"reclaimableBalance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transferAndAllowReclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"}],"name":"revoke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuerName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newFee","type":"uint128"}],"name":"setFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"},{"name":"reclaimer","type":"address"}],"name":"reclaimableBalanceBy","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"signature","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerCertificate","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"liability","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"from","type":"address"},{"name":"amount","type":"uint64"}],"name":"reclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_signature","type":"bytes"}],"name":"sign","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"relevantIssuances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"relevantIssuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"certificateText","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lobRoot","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"safekeepingPeriod","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"numLicenses","type":"uint64"},{"name":"auditRemark","type":"string"},{"name":"auditTime","type":"uint32"},{"name":"initialOwner","type":"address"}],"name":"issueLicense","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"fee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"issuances","outputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"originalSupply","type":"uint64"},{"name":"auditTime","type":"uint32"},{"name":"auditRemark","type":"string"},{"name":"revoked","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_issuer","type":"address"},{"name":"_issuerName","type":"string"},{"name":"_liability","type":"string"},{"name":"_issuerCertificate","type":"bytes"},{"name":"_safekeepingPeriod","type":"uint8"},{"name":"_fee","type":"uint128"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Issuing","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"},{"indexed":false,"name":"reclaimable","type":"bool"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"}],"name":"Reclaim","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newFee","type":"uint128"}],"name":"FeeChange","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        __licenseContracts[address] = abi.at(address, null);
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
        __rootContracts[address] = abi.at(address, null);
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
        logWeb3Call(licenseContractAddress, "Issuing.watch");
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
        logWeb3Call(licenseContractAddress, "Transfer.watch");
        // noinspection JSUnresolvedFunction
        licenseContract.Transfer({}, {fromBlock: 'latest'}).watch((error, transfer) => {
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
        logWeb3Call(licenseContractAddress, "Revoke.watch");
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
        logWeb3Call(rootContractAddress, "LicenseContractCreation.watch");
        rootContract.LicenseContractCreation({}, {fromBlock: 'latest'}).watch((error, creation) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(creation.args.licenseContractAddress);
        });
    }
}

const __issuerNames = {};
const __sslCertificates = {};

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
                logWeb3Call(licenseContractAddress, "issuerName");
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
        this._reclaimableBalance = new ReactiveMap(() => {
            return new BigNumber(0);
        });
    }

    getOwnedBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        let balance = new BigNumber(0);
        for (const account of accounts) {
            const accountBalance = this._balance.getKey(account).minus(this._reclaimableBalance.getKey(account))
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

    getReclaimableBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        let balance = new BigNumber(0);
        for (const account of accounts) {
            balance = balance.plus(this._reclaimableBalance.getKey(account));
        }
        return balance;
    }

    setBalance(account, newBalance) {
        this._balance.setKey(account, newBalance);
    }

    setReclaimableBalance(account, newBalance) {
        this._reclaimableBalance.setKey(account, newBalance);
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
        logWeb3Call(licenseContractAddress, "relevantIssuancesCount", [ownerAddress]);
        // noinspection JSUnresolvedFunction
        licenseContract.relevantIssuancesCount(ownerAddress, (error, relevantIssuancesCount) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < relevantIssuancesCount; i++) {
                logWeb3Call(licenseContractAddress, "relevantIssuances", [ownerAddress, i]);
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
                    this._updateAllBalancesForIssuance(new IssuanceLocation(licenseContractAddress, relevantIssuanceID));
                });
            }

            EthNotificationCenter.onNewIssuing(licenseContractAddress, (issuing) => {
                this._updateAllBalancesForIssuance(new IssuanceLocation(licenseContractAddress, issuing.args.issuanceID));
            });

            EthNotificationCenter.onNewTransfer(licenseContractAddress, (transfer) => {
                if (error) { handleUnknownEthereumError(error); return; }
                for (const address of [transfer.args.from, transfer.args.to]) {
                    if (accounts.indexOf(address) !== -1) { // Ignore if it doesn't affect us
                        const issuanceID = transfer.args.issuanceID.toNumber();
                        this.updateBalance(new IssuanceLocation(licenseContractAddress, issuanceID), address);
                    }
                }
            });

            EthNotificationCenter.onNewRevoke(licenseContractAddress, (revoke) => {
                const issuanceID = revoke.args.issuanceID.toNumber();
                const issuanceLocation = new IssuanceLocation(licenseContractAddress, issuanceID);
                if (this._watchedIssuances.hasKey(issuanceLocation)) {
                    this._watchedIssuances.getKey(issuanceLocation).revoked.set(true);
                }
            });
        });
    }

    watchRootContract(rootContractAddress) {
        const rootContract = getRootContract(rootContractAddress);

        logWeb3Call(rootContractAddress, "licenseContractCount");
        rootContract.licenseContractCount((error, licenseContractCount) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < licenseContractCount.toNumber(); i++) {
                logWeb3Call(rootContractAddress, "licenseContracts", [i]);
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

        logWeb3Call(licenseContract.address, "balance", [issuanceLocation.issuanceID, accountAddress]);
        licenseContract.balance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) { handleUnknownEthereumError(error); return; }

            this._watchedIssuances.updateKey(issuanceLocation, (issuance) => {
                issuance.setBalance(accountAddress, balance);
                return issuance;
            });
        });

        logWeb3Call(licenseContract.address, "reclaimableBalance", [issuanceLocation.issuanceID, accountAddress]);
        licenseContract.reclaimableBalance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) { handleUnknownEthereumError(error); return; }

            this._watchedIssuances.updateKey(issuanceLocation, (issuance) => {
                issuance.setReclaimableBalance(accountAddress, balance);
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
        logWeb3Call(licenseContract.address, "issuances", [issuanceID]);
        licenseContract.issuances(issuanceID, (error, rawIssuanceData) => {
            if (error) { handleUnknownEthereumError(error); return; }

            callback(rawIssuanceData);
        });
    }

    transferLicense(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        logWeb3Call(licenseContract.address, "transfer", [issuanceLocation.issuanceID, to, amount]);
        return licenseContract.transfer(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, callback);
    }

    estimateGasTransferLicense(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        logWeb3Call(licenseContract.address, "transfer.estimateGas", [issuanceLocation.issuanceID, to, amount]);
        licenseContract.transfer.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

    transferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        logWeb3Call(licenseContract.address, "transferAndAllowReclaim", [issuanceLocation.issuanceID, to, amount]);
        return licenseContract.transferAndAllowReclaim(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, callback);
    }

    estimateGasTransferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        logWeb3Call(licenseContract.address, "transferAndAllowReclaim.estimateGase", [issuanceLocation.issuanceID, to, amount]);
        licenseContract.transferAndAllowReclaim.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

    getCertificateText(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        logWeb3Call(licenseContractAddress, "certificateText", []);
        licenseContract.certificateText(callback);
    }

    getIssuerCertificate(licenseContractAddress, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        logWeb3Call(licenseContractAddress, "certificateText", []);
        licenseContract.issuerCertificate(callback);
    }

    getLicenseTransfers(issuanceLocation, callback) {
        const licenseContractAddress = issuanceLocation.licenseContractAddress;
        const issuanceID = issuanceLocation.issuanceID;
        const licenseContract = getLicenseContract(licenseContractAddress);
        logWeb3Call(licenseContract.address, "Transfer.get", []);
        licenseContract.Transfer({issuanceID}, {fromBlock: 0}).get((error, transfers) => {
            if (error) {
                callback(error);
                return;
            }
            transfers = transfers.filter((transfer) => transfer.args.issuanceID.equals(issuanceID));
            callback(null, transfers);
        });
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
