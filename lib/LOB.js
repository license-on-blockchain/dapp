import { ReactiveMap } from './ReactiveMap';
import { handleUnknownEthereumError } from "./ErrorHandling";
import { LazyReactiveVar } from "./LazyReactiveVar";
import { IssuanceLocation } from "./IssuanceLocation";
import { hexToBytes } from "./utils";
import { Balances } from "./lob/Balances";
import './init.js';
import {Transfer} from "./lob/Transfer";
import {LicenseIssuing} from "./lob/LicenseIssuing";
import {getLicenseContract, getRootContract} from "./lob/contractRetrieval";
import {EthNotificationCenter} from "./lob/EthNotificationCenter";

const getAccounts = function(callback) {
    web3.eth.getAccounts(callback);
};

// TODO: Only sign up for events once and call all observers locally


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
        this.licenseIssuing = new LicenseIssuing();
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
}

export const lob = new LOB();
