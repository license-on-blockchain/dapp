import {getLicenseContract, getRootContract} from "./contractRetrieval";
import {IssuanceLocation} from "../IssuanceLocation";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {getAccounts} from "../Accounts";

/**
 * The balance of multiple accounts for one issuance location
 */
export class Balance {
    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {Mongo.Collection} balancesCollection
     */
    constructor(issuanceLocation, balancesCollection) {
        this._licenseContract = issuanceLocation.licenseContractAddress;
        this._issuanceID = issuanceLocation.issuanceID;
        this._balances = balancesCollection;
    }

    getOwnedBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            licenseContract: this._licenseContract,
            issuanceID: this._issuanceID,
            account: {$in: accounts},
        };
        const balance = this._balances.find(query).map((doc) => ((doc.balance || 0) - (doc.borrowedBalance || 0))).reduce((x, y) => x + y, 0);
        return new BigNumber(balance);
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
        const query = {
            licenseContract: this._licenseContract,
            issuanceID: this._issuanceID,
            account: {$in: accounts},
            balance: {$exists: true}
        };
        const balance = this._balances.find(query).map((doc) => doc.balance).reduce((x, y) => x + y, 0);
        return new BigNumber(balance);
    }

    getBorrowedBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            licenseContract: this._licenseContract,
            issuanceID: this._issuanceID,
            account: {$in: accounts},
            borrowedBalance: {$exists: true}
        };
        const balance = this._balances.find(query).map((doc) => doc.borrowedBalance).reduce((x, y) => x + y, 0);
        return new BigNumber(balance);
    }

    /**
     * @param {string} account
     * @param {number} newBalance
     */
    setBalance(account, newBalance) {
        const query = {
            licenseContract: this._licenseContract,
            issuanceID: this._issuanceID,
            account: account,
        };
        if (!this._balances.findOne(query)) {
            this._balances.insert(query);
        }
        this._balances.update(query, {$set: {balance: newBalance}});
    }

    /**
     * @param {string} account
     * @param {number} newBalance
     */
    setBorrowedBalance(account, newBalance) {
        const query = {
            licenseContract: this._licenseContract,
            issuanceID: this._issuanceID,
            account: account,
        };
        if (!this._balances.findOne(query)) {
            this._balances.insert(query);
        }
        this._balances.update(query, {$set: {borrowedBalance: newBalance}});
    }
}

export class OpenReclaims {
    /**
     * @param {string} reclaimer
     * @param {Mongo.Collection} openReclaims
     */
    constructor(reclaimer, openReclaims) {
        this._reclaimer = reclaimer;
        this._openReclaims = openReclaims;
    }

    /**
     * Get all issuance locations that may be reclaimable.
     * @returns {IssuanceLocation[]}
     */
    getReclaimableIssuanceLocations() {
        return this._openReclaims.find({reclaimer: this._reclaimer, balance: {$gt: 0}}).map((doc) => {
            return IssuanceLocation.fromComponents(doc.licenseContract, doc.issuanceID);
        });
    }

    /**
     * Get all addresses from which licenses of the given issuance location may be reclaimable.
     * @param {IssuanceLocation} issuanceLocation
     * @returns {string[]}
     */
    getReclaimOrigins(issuanceLocation) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            reclaimer: this._reclaimer
        };
        return this._openReclaims.find(query).map((doc) => doc.currentOwner);
    }

    /**
     * Get the number of licenses of the given issuance location that can be reclaimed from any address.
     * @param {IssuanceLocation} issuanceLocation
     * @returns {number}
     */
    getReclaimableBalance(issuanceLocation) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            reclaimer: this._reclaimer
        };
        return this._openReclaims.find(query).map((doc) => doc.balance).reduce((x, y) => x + y, 0);
    }

    /**
     * Get the number of licenses of the given issuance location that can be reclaimed from the given address.
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} currentOwner
     * @returns {number}
     */
    getReclaimableBalanceFrom(issuanceLocation, currentOwner) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            reclaimer: this._reclaimer,
            currentOwner: currentOwner
        };
        const doc = this._openReclaims.findOne(query);
        if (doc) {
            return doc.balance;
        } else {
            return 0;
        }
    }

    /**
     * Set the number of licenses of the given issuance location that can be reclaimed from the given address.
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} currentOwner
     * @param {number} newReclaimableBalance
     */
    setReclaimableBalanceFrom(issuanceLocation, currentOwner, newReclaimableBalance) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            currentOwner: currentOwner,
            reclaimer: this._reclaimer
        };
        const data = {...query, balance: newReclaimableBalance};
        this._openReclaims.upsert(query, data);
    }
}

export class Balances {
    constructor() {
        this._balancesCollection = new Mongo.Collection('balances', {connection: null});
        this._openReclaimsCollection = new Mongo.Collection('openReclaims', {connection: null});
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {Balance} A balances object
     */
    getBalanceForIssuanceLocation(issuanceLocation) {
        return new Balance(issuanceLocation, this._balancesCollection);
    }

    /**
     * @param {string} reclaimer
     * @returns {OpenReclaims}
     */
    getOpenReclaims(reclaimer) {
        return new OpenReclaims(reclaimer, this._openReclaimsCollection);
    }

    /**
     * Retrieve The issuance locations for which any of the given addresses has a non-zero balance
     * @param {string|string[]} accounts
     * @returns {IssuanceLocation[]}
     */
    getNonZeroBalanceIssuanceLocations(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            account: {$in: accounts},
            balance: {$gt: 0}
        };
        return this._balancesCollection.find(query).map((doc) => {
            return IssuanceLocation.fromComponents(doc.licenseContract, doc.issuanceID);
        });
    }

    /**
     * Get all license transfer and reclaim events for the given issuance location.
     * @param {IssuanceLocation} issuanceLocation
     * @param {function(error, events)} callback
     */
    getLicenseTransfers(issuanceLocation, callback) {
        // TODO: This could be cached and augmented based on events
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

    /**
     * Update the number of licenses `originalOwner` can reclaim from `currentOwner` and store the value.
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} originalOwner
     * @param {string} currentOwner
     * @private
     */
    _updateReclaimableBalance(issuanceLocation, originalOwner, currentOwner) {
        // TODO: Clear '?' reclaimer at the end
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaimableBalanceBy(issuanceLocation.issuanceID, currentOwner, originalOwner, (error, reclaimableBalance) => {
            if (error) {
                handleUnknownEthereumError(error);
                return;
            }
            this.getOpenReclaims(originalOwner).setReclaimableBalanceFrom(issuanceLocation, currentOwner, reclaimableBalance.toNumber());
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @private
     */
    _updateAllBalancesForIssuance(issuanceLocation) {
        getAccounts((accounts) => {
            // Retrieve initial balances. If a balance is non-zero and metadata is missing, metadata will be retrieved
            for (const address of accounts) {
                this._updateBalanceForIssuanceAndAddress(issuanceLocation, address);
            }
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} accountAddress
     * @private
     */
    _updateBalanceForIssuanceAndAddress(issuanceLocation, accountAddress) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);

        licenseContract.balance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) {
                handleUnknownEthereumError(error);
                return;
            }

            this.getBalanceForIssuanceLocation(issuanceLocation).setBalance(accountAddress, balance.toNumber());
        });

        licenseContract.reclaimableBalance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) {
                handleUnknownEthereumError(error);
                return;
            }

            this.getBalanceForIssuanceLocation(issuanceLocation).setBorrowedBalance(accountAddress, balance.toNumber());
        });
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

    _updateAllRelevantBalancesForLicenseContract(licenseContractAddress) {
        getAccounts((accounts) => {
            for (const address of accounts) {
                this._forEachRelevantIssuanceID(licenseContractAddress, address, (relevantIssuanceID) => {
                    const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, relevantIssuanceID);
                    this._updateAllBalancesForIssuance(issuanceLocation);

                    this._forEachReclaimableLicense(issuanceLocation, address, (currentOwner) => {
                        this._updateReclaimableBalance(issuanceLocation, address, currentOwner);
                    });
                });
            }
        });
    }

    /**
     * @param {string} licenseContractAddress
     */
    _watchLicenseContractForNewBalances(licenseContractAddress) {
        getAccounts((accounts) => {
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
                        this._updateBalanceForIssuanceAndAddress(issuanceLocation, address);
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
                        this._updateBalanceForIssuanceAndAddress(issuanceLocation, address);
                    }
                }

                if (accounts.indexOf(to) !== -1) {
                    this._updateReclaimableBalance(issuanceLocation, to, from);
                }
            });
        });
    }
}