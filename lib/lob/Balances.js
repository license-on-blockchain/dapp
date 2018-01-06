import {getLicenseContract} from "./contractRetrieval";
import {IssuanceLocation} from "../IssuanceLocation";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {Accounts} from "../Accounts";

export class Balances {
    /**
     * @param {Transactions} transactions
     */
    constructor(transactions) {
        this._balances = new Mongo.Collection('balances', {connection: null});
        this._openReclaims = new Mongo.Collection('openReclaims', {connection: null});
        this._transactions = transactions;
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
        return this._balances.find(query).map((doc) => {
            return IssuanceLocation.fromComponents(doc.licenseContract, doc.issuanceID);
        });
    }

    /**
     * Get the number of licenses of the given issuance associated to any of the given accounts (including borrowed
     * licenses).
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string[]|string} accounts A list of accounts for which balances should be added or a single address
     */
    getBalance(issuanceLocation, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            account: {$in: accounts},
            balance: {$exists: true}
        };
        const balance = this._balances.find(query)
            .map((doc) => doc.balance)
            .reduce((x, y) => x + y, 0);

        const pendingBalanceChange = this._transactions.getPendingBalanceChange(issuanceLocation, accounts);
        return balance + pendingBalanceChange;
    }

    /**
     * Get the number of licenses of the given issuance jointly owned by the given accounts (excluding borrowed
     * licenses).
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string[]|string} accounts A list of accounts for which balances should be added or a single address
     * @return {number}
     */
    getOwnedBalance(issuanceLocation, accounts) {
        return this.getBalance(issuanceLocation, accounts) - this.getBorrowedBalance(issuanceLocation, accounts);
    }

    /**
     * Get the number of licenses of the given issuance that the given accounts have borrowed from some other account.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string[]|string} accounts A list of accounts for which balances should be added or a single address
     * @return {number}
     */
    getBorrowedBalance(issuanceLocation, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            account: {$in: accounts},
            borrowedBalance: {$exists: true}
        };
        return this._balances.find(query)
            .map((doc) => doc.borrowedBalance)
            .reduce((x, y) => x + y, 0);
    }

    /**
     * Set the balance (including borrowed licenses) of a given account for a given issuance location.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} account
     * @param {number} newBalance
     * @private
     */
    _setBalance(issuanceLocation, account, newBalance) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            account: account,
        };
        if (!this._balances.findOne(query)) {
            this._balances.insert(query);
        }
        this._balances.update(query, {$set: {balance: newBalance}});
    }

    /**
     * Set the balance of an issuance lcoation a given account has borrowed from other accounts.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} account
     * @param {number} newBalance
     * @private
     */
    _setBorrowedBalance(issuanceLocation, account, newBalance) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            account: account,
        };
        if (!this._balances.findOne(query)) {
            this._balances.insert(query);
        }
        this._balances.update(query, {$set: {borrowedBalance: newBalance}});
    }

    /**
     * Get all issuance locations that may be reclaimable by any of the given accounts
     *
     * @param {string[]|string} accounts A single account or an array of accounts
     * @returns {IssuanceLocation[]}
     */
    getReclaimableIssuanceLocations(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const issuanceLocations = this._openReclaims.find({reclaimer: {$in: accounts}, balance: {$gt: 0}})
            .map((doc) => {
                return IssuanceLocation.fromComponents(doc.licenseContract, doc.issuanceID);
            });
        // Make unique
        return Array.from(new Set(issuanceLocations));
    }

    /**
     * Get all addresses from which licenses of the given issuance location may be reclaimable by any of the given
     * accounts.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string|string[]} accounts A single account or an array of accounts
     * @returns {string[]}
     */
    getReclaimOrigins(issuanceLocation, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            reclaimer: {$in: accounts}
        };
        return this._openReclaims.find(query)
            .map((doc) => doc.currentOwner);
    }

    /**
     * Get the number of licenses of the given issuance location that can be reclaimed from any address.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string|string[]} accounts A single account or an array of accounts
     * @returns {number}
     */
    getReclaimableBalance(issuanceLocation, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            reclaimer: {$in: accounts}
        };
        const balance = this._openReclaims.find(query)
            .map((doc) => doc.balance)
            .reduce((x, y) => x + y, 0);
        const pendingBalance = this._transactions.getPendingReclaimableBalance(issuanceLocation, accounts);
        return balance + pendingBalance;
    }

    /**
     * Get the number of licenses of the given issuance location that can be reclaimed from the given address.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string|string[]} accounts A single account or an array of accounts
     * @param {string} currentOwner
     * @returns {number}
     */
    getReclaimableBalanceFrom(issuanceLocation, accounts, currentOwner) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            reclaimer: {$in: accounts},
            currentOwner: currentOwner
        };
        const doc = this._openReclaims.findOne(query);
        let balance = 0;
        if (doc) {
            balance += doc.balance;
        }
        balance += this._transactions.getPendingReclaimableBalanceFrom(issuanceLocation, accounts, currentOwner);
        return balance;
    }

    /**
     * Set the number of licenses of the given issuance location that can be reclaimed from the given address.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {string} currentOwner
     * @param {number} newReclaimableBalance
     * @private
     */
    _setReclaimableBalanceFrom(issuanceLocation, reclaimer, currentOwner, newReclaimableBalance) {
        const query = {
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            currentOwner: currentOwner,
            reclaimer: reclaimer
        };
        const data = {...query, balance: newReclaimableBalance};
        this._openReclaims.upsert(query, data);
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
     * @returns {Promise} A Promise without a return value that is fulfilled when the balance has been updated
     * @private
     */
    _updateReclaimableBalance(issuanceLocation, originalOwner, currentOwner) {
        return new Promise((resolve, reject) => {
            const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
            licenseContract.reclaimableBalanceBy(issuanceLocation.issuanceID, currentOwner, originalOwner, (error, reclaimableBalance) => {
                if (error) {
                    reject(error);
                } else {
                    this._setReclaimableBalanceFrom(issuanceLocation, originalOwner, currentOwner, reclaimableBalance.toNumber());
                    resolve();
                }
            });
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string[]} accounts The accounts for which to update the balances
     * @returns {Promise} A promise with no return value that is fulfilled when all updates have finished
     * @private
     */
    _updateAllBalancesForIssuance(issuanceLocation, accounts) {
        const promises = [];

        // Retrieve initial balances. If a balance is non-zero and metadata is missing, metadata will be retrieved
        for (const address of accounts) {
            const promise = this._updateBalanceForIssuanceAndAddress(issuanceLocation, address);
            promises.push(promise);
        }
        return Promise.all(promises)
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} accountAddress
     * @returns {Promise} A promise with no return value that is fulfilled when the balance has been updated
     * @private
     */
    _updateBalanceForIssuanceAndAddress(issuanceLocation, accountAddress) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);

        const updateBalancePromise = new Promise((resolve, reject) => {
            licenseContract.balance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
                if (error) {
                    reject(error);
                } else {
                    this._setBalance(issuanceLocation, accountAddress, balance.toNumber());
                    resolve();
                }
            });
        });

        const updateReclaimableBalancePromise = new Promise((resolve, reject) => {
            licenseContract.reclaimableBalance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
                if (error) {
                    reject(error);
                } else {
                    this._setBorrowedBalance(issuanceLocation, accountAddress, balance.toNumber());
                    resolve();
                }
            });
        });

        return Promise.all([updateBalancePromise, updateReclaimableBalancePromise]);
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} ownerAddress
     * @return {Promise.<Set>} A Promise containing all relevant issuance IDs
     * @private
     */
    _getRelevantIssuanceIDs(licenseContractAddress, ownerAddress) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        const issuancesCount = new Promise((resolve, reject) => {
            licenseContract.relevantIssuancesCount(ownerAddress, (error, relevantIssuancesCount) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(relevantIssuancesCount);
                }
            });
        });

        const relevantIssuanceIDs = issuancesCount.then((relevantIssuancesCount) => {
            const relevantIssuanceIDPromises = [];

            for (let i = 0; i < relevantIssuancesCount; i++) {
                const promise = new Promise((resolve, reject) => {
                    licenseContract.relevantIssuances(ownerAddress, i, (error, relevantIssuanceID) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(relevantIssuanceID.toNumber());
                        }
                    });
                });

                relevantIssuanceIDPromises.push(promise);
            }

            return Promise.all(relevantIssuanceIDPromises);
        });

        return relevantIssuanceIDs.then((relevantIssuanceIDs) => {
            return new Set(relevantIssuanceIDs);
        });
    }

    /**
     * Invoke the callback once for every address that `reclaimer` can reclaim licenses of the given location from. This
     * is an over-approximation and thus not all addresses returned by this may still have a borrowed balance.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @returns {Promise.<Set>} A Promise containing all addresses from which the reclaimer may reclaim the given
     *                          issuance from
     * @private
     */
    _getReclaimOrigins(issuanceLocation, reclaimer) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);

        const count = new Promise((resolve, reject) => {
            licenseContract.addressesLicensesCanBeReclaimedFromCount(issuanceLocation.issuanceID, reclaimer, (error, count) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(count.toNumber());
                }
            });
        });

        const addressesLicensesCanBeReclaimedFrom = count.then((count) => {
            const promises = [];

            for (let i = 0; i < count; i++) {
                const promise = new Promise((resolve, reject) => {
                    licenseContract.addressesLicensesCanBeReclaimedFrom(issuanceLocation.issuanceID, reclaimer, i, (error, reclaimableFromAddress) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(reclaimableFromAddress.toLowerCase());
                        }
                    });
                });
                promises.push(promise);
            }

            return Promise.all(promises);
        });

        return addressesLicensesCanBeReclaimedFrom.then((addressesLicensesCanBeReclaimedFrom) => {
            return new Set(addressesLicensesCanBeReclaimedFrom);
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
                    reclaimableFromAddress = reclaimableFromAddress.toLowerCase();
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
     * @param {string} licenseContractAddress
     * @param {string[]} accounts The accounts to update the balances for
     * @return {Promise} A promise without a return value that is fulfilled when all balances have been updated
     */
    updateAllRelevantBalancesForLicenseContract(licenseContractAddress, accounts) {
        const promises = [];
        for (const address of accounts) {
            const promise = this._getRelevantIssuanceIDs(licenseContractAddress, address).then((relevantIssuanceIDs) => {
                const promises = [];
                for (const relevantIssuanceID of relevantIssuanceIDs) {
                    const issuanceLocation = IssuanceLocation.fromComponents(licenseContractAddress, relevantIssuanceID);
                    const updateBalancePromise = this._updateAllBalancesForIssuance(issuanceLocation, accounts);
                    promises.push(updateBalancePromise);


                    // TODO: Only do this if reclaim actions are activated
                    const updateReclaimableBalancePromise = this._getReclaimOrigins(issuanceLocation, address).then((reclaimOrigins) => {
                        const promises = [];
                        for (const reclaimOrigin of reclaimOrigins) {
                            const promise = this._updateReclaimableBalance(issuanceLocation, address, reclaimOrigin);
                            promises.push(promise);
                        }
                        return Promise.all(promises);
                    });
                    promises.push(updateReclaimableBalancePromise);
                }
                return Promise.all(promises);
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    }

    /**
     * Listen for changing balances on the given license contract.
     *
     * @param {string} licenseContractAddress
     * @param {string[]} accounts The accounts to update the balances for
     */
    watchLicenseContractForNewBalances(licenseContractAddress, accounts) {
        EthNotificationCenter.onNewIssuing(licenseContractAddress, (event) => {
            this.updateAllRelevantBalancesForLicenseContract(IssuanceLocation.fromComponents(licenseContractAddress, event.args.issuanceID), accounts);
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
    }
}