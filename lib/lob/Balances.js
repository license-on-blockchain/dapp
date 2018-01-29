import {getLicenseContract} from "./contractRetrieval";
import {IssuanceID} from "../IssuanceID";
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
     * Retrieve The issuance IDs for which any of the given addresses has a non-zero balance
     * @param {string|string[]} accounts
     * @returns {IssuanceID[]}
     */
    getNonZeroBalanceIssuanceIDs(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            account: {$in: accounts},
            balance: {$gt: 0}
        };
        return this._balances.find(query).map((doc) => {
            return IssuanceID.fromComponents(doc.licenseContract, doc.issuanceNumber);
        });
    }

    /**
     * Get the number of licenses of the given issuance associated to any of the given accounts (including borrowed
     * licenses).
     *
     * @param {IssuanceID} issuanceID
     * @param {string[]|string} accounts A list of accounts for which balances should be added or a single address
     */
    getBalance(issuanceID, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            account: {$in: accounts},
            balance: {$exists: true}
        };
        const balance = this._balances.find(query)
            .map((doc) => doc.balance)
            .reduce((x, y) => x + y, 0);

        const pendingBalanceChange = this._transactions.getPendingBalance(issuanceID, accounts);
        return balance + pendingBalanceChange;
    }

    /**
     * Get the number of licenses of the given issuance jointly owned by the given accounts (excluding temporarily owned
     * licenses).
     *
     * @param {IssuanceID} issuanceID
     * @param {string[]|string} accounts A list of accounts for which balances should be added or a single address
     * @return {number}
     */
    getProperBalance(issuanceID, accounts) {
        return this.getBalance(issuanceID, accounts) - this.getTemporaryBalance(issuanceID, accounts);
    }

    /**
     * Get the number of licenses of the given issuance that the given accounts own temporarily.
     *
     * @param {IssuanceID} issuanceID
     * @param {string[]|string} accounts A list of accounts for which balances should be added or a single address
     * @return {number}
     */
    getTemporaryBalance(issuanceID, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            account: {$in: accounts},
            temporaryBalance: {$exists: true}
        };
        return this._balances.find(query)
            .map((doc) => doc.temporaryBalance)
            .reduce((x, y) => x + y, 0);
    }

    /**
     * Set the balance (including borrowed licenses) of a given account for a given issuance ID.
     *
     * @param {IssuanceID} issuanceID
     * @param {string} account
     * @param {number} newBalance
     * @private
     */
    _setBalance(issuanceID, account, newBalance) {
        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
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
     * @param {IssuanceID} issuanceID
     * @param {string} account
     * @param {number} newBalance
     * @private
     */
    _setTemporaryBalance(issuanceID, account, newBalance) {
        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            account: account,
        };
        if (!this._balances.findOne(query)) {
            this._balances.insert(query);
        }
        this._balances.update(query, {$set: {temporaryBalance: newBalance}});
    }

    /**
     * Get all issuance IDs that may be reclaimable by any of the given accounts
     *
     * @param {string[]|string} accounts A single account or an array of accounts
     * @returns {IssuanceID[]}
     */
    getReclaimableIssuanceIDs(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const issuanceIDs = this._openReclaims.find({reclaimer: {$in: accounts}, balance: {$gt: 0}})
            .map((doc) => {
                return IssuanceID.fromComponents(doc.licenseContract, doc.issuanceNumber);
            });
        // Make unique
        return Array.from(new Set(issuanceIDs));
    }

    /**
     * Get all addresses from which licenses of the given issuance ID may be reclaimable by any of the given
     * accounts.
     *
     * @param {IssuanceID} issuanceID
     * @param {string|string[]} accounts A single account or an array of accounts
     * @returns {string[]}
     */
    getReclaimOrigins(issuanceID, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            reclaimer: {$in: accounts}
        };
        return this._openReclaims.find(query)
            .map((doc) => doc.currentOwner);
    }

    /**
     * Get the number of licenses of the given issuance ID that can be reclaimed from any address.
     *
     * @param {IssuanceID} issuanceID
     * @param {string|string[]} accounts A single account or an array of accounts
     * @returns {number}
     */
    getReclaimableBalance(issuanceID, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            reclaimer: {$in: accounts}
        };
        const balance = this._openReclaims.find(query)
            .map((doc) => doc.balance)
            .reduce((x, y) => x + y, 0);
        const pendingBalance = this._transactions.getPendingReclaimableBalance(issuanceID, accounts);
        return balance + pendingBalance;
    }

    /**
     * Get the number of licenses of the given issuance ID that can be reclaimed from the given address.
     *
     * @param {IssuanceID} issuanceID
     * @param {string|string[]} accounts A single account or an array of accounts
     * @param {string} currentOwner
     * @returns {number}
     */
    getReclaimableBalanceFrom(issuanceID, accounts, currentOwner) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            reclaimer: {$in: accounts},
            currentOwner: currentOwner
        };
        const doc = this._openReclaims.findOne(query);
        let balance = 0;
        if (doc) {
            balance += doc.balance;
        }
        balance += this._transactions.getPendingReclaimableBalanceFrom(issuanceID, accounts, currentOwner);
        return balance;
    }

    /**
     * Set the number of licenses of the given issuance ID that can be reclaimed from the given address.
     *
     * @param {IssuanceID} issuanceID
     * @param {string} reclaimer
     * @param {string} currentOwner
     * @param {number} newReclaimableBalance
     * @private
     */
    _setReclaimableBalanceFrom(issuanceID, reclaimer, currentOwner, newReclaimableBalance) {
        const query = {
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            currentOwner: currentOwner,
            reclaimer: reclaimer
        };
        const data = {...query, balance: newReclaimableBalance};
        this._openReclaims.upsert(query, data);
    }

    /**
     * Get all license transfer and reclaim events for the given issuance ID.
     * @param {IssuanceID} issuanceID
     * @param {function(error, events)} callback
     */
    getLicenseTransfers(issuanceID, callback) {
        // TODO: This could be cached and augmented based on events
        const licenseContractAddress = issuanceID.licenseContractAddress;
        const issuanceNumber = issuanceID.issuanceNumber;
        const licenseContract = getLicenseContract(licenseContractAddress);
        const transfersP = new Promise((resolve, reject) => {
            licenseContract.Transfer({issuanceNumber}, {fromBlock: 0}).get((error, transfers) => {
                if (error) {
                    reject(error);
                    return;
                }
                transfers = transfers.filter((transfer) => transfer.args.issuanceNumber.equals(issuanceNumber));
                resolve(transfers);
            });
        });
        const reclaimsP = new Promise((resolve, reject) => {
            licenseContract.Reclaim({issuanceNumber}, {fromBlock: 0}).get((error, reclaims) => {
                if (error) {
                    reject(error);
                    return;
                }
                reclaims = reclaims.filter((transfer) => transfer.args.issuanceNumber.equals(issuanceNumber));
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
     * @param {IssuanceID} issuanceID
     * @param {string} originalOwner
     * @param {string} currentOwner
     * @returns {Promise} A Promise without a return value that is fulfilled when the balance has been updated
     * @private
     */
    _updateTemporaryBalance(issuanceID, originalOwner, currentOwner) {
        return new Promise((resolve, reject) => {
            const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
            licenseContract.temporaryBalanceReclaimableBy(issuanceID.issuanceNumber, currentOwner, originalOwner, (error, reclaimableBalance) => {
                if (error) {
                    reject(error);
                } else {
                    this._setReclaimableBalanceFrom(issuanceID, originalOwner, currentOwner, reclaimableBalance.toNumber());
                    resolve();
                }
            });
        });
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string[]} accounts The accounts for which to update the balances
     * @returns {Promise} A promise with no return value that is fulfilled when all updates have finished
     * @private
     */
    _updateAllBalancesForIssuance(issuanceID, accounts) {
        const promises = [];

        // Retrieve initial balances. If a balance is non-zero and metadata is missing, metadata will be retrieved
        for (const address of accounts) {
            const promise = this._updateBalanceForIssuanceAndAddress(issuanceID, address);
            promises.push(promise);
        }
        return Promise.all(promises)
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string} accountAddress
     * @returns {Promise} A promise with no return value that is fulfilled when the balance has been updated
     * @private
     */
    _updateBalanceForIssuanceAndAddress(issuanceID, accountAddress) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);

        const updateBalancePromise = new Promise((resolve, reject) => {
            licenseContract.balance(issuanceID.issuanceNumber, accountAddress, (error, balance) => {
                if (error) {
                    reject(error);
                } else {
                    this._setBalance(issuanceID, accountAddress, balance.toNumber());
                    resolve();
                }
            });
        });

        const updateReclaimableBalancePromise = new Promise((resolve, reject) => {
            licenseContract.temporaryBalance(issuanceID.issuanceNumber, accountAddress, (error, temporaryBalance) => {
                if (error) {
                    reject(error);
                } else {
                    this._setTemporaryBalance(issuanceID, accountAddress, temporaryBalance.toNumber());
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
     * Invoke the callback once for every address that `reclaimer` can reclaim licenses of the given issuance ID from.
     * This is an over-approximation and thus not all addresses returned by this may still have a borrowed balance.
     *
     * @param {IssuanceID} issuanceID
     * @param {string} reclaimer
     * @returns {Promise.<Set>} A Promise containing all addresses from which the reclaimer may reclaim the given
     *                          issuance from
     * @private
     */
    _getReclaimOrigins(issuanceID, reclaimer) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);

        const count = new Promise((resolve, reject) => {
            licenseContract.temporaryLicenseHoldersCount(issuanceID.issuanceNumber, reclaimer, (error, count) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(count.toNumber());
                }
            });
        });

        const temporaryLicenseHolders = count.then((count) => {
            const promises = [];

            for (let i = 0; i < count; i++) {
                const promise = new Promise((resolve, reject) => {
                    licenseContract.temporaryLicenseHolders(issuanceID.issuanceNumber, reclaimer, i, (error, reclaimableFromAddress) => {
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

        return temporaryLicenseHolders.then((temporaryLicenseHolders) => {
            return new Set(temporaryLicenseHolders);
        });
    }

    /**
     * Invoke the callback once for every address that `reclaimer` can reclaim licenses of the given issuance ID from.
     * This is an over-approximation and thus not all addresses returned by this may still have a borrowed balance.
     *
     * @param {IssuanceID} issuanceID
     * @param {string} reclaimer
     * @param {function(string)} callback Gets passed the address from which licenses may be reclaimed as parameter.
     * @private
     */
    _forEachReclaimableLicense(issuanceID, reclaimer, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);

        const handledAddresses = new Set();

        licenseContract.temporaryLicenseHoldersCount(issuanceID.issuanceNumber, reclaimer, (error, count) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < count.toNumber(); i++) {
                licenseContract.temporaryLicenseHolders(issuanceID.issuanceNumber, reclaimer, i, (error, reclaimableFromAddress) => {
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
                    const issuanceID = IssuanceID.fromComponents(licenseContractAddress, relevantIssuanceID);
                    const updateBalancePromise = this._updateAllBalancesForIssuance(issuanceID, accounts);
                    promises.push(updateBalancePromise);


                    // TODO: Only do this if reclaim actions are activated
                    const updateReclaimableBalancePromise = this._getReclaimOrigins(issuanceID, address).then((reclaimOrigins) => {
                        const promises = [];
                        for (const reclaimOrigin of reclaimOrigins) {
                            const promise = this._updateTemporaryBalance(issuanceID, address, reclaimOrigin);
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
            this._updateAllBalancesForIssuance(IssuanceID.fromComponents(licenseContractAddress, event.args.issuanceNumber.toNumber()), accounts).catch((error) => {
                handleUnknownEthereumError(error);
            });
        });

        EthNotificationCenter.onNewTransfer(licenseContractAddress, accounts, (transfer) => {
            const issuanceNumber = transfer.args.issuanceNumber.toNumber();
            const issuanceID = IssuanceID.fromComponents(licenseContractAddress, issuanceNumber);
            const from = transfer.args.from;
            const to = transfer.args.to;

            for (const address of [from, to]) {
                this._updateBalanceForIssuanceAndAddress(issuanceID, address).catch((error) => {
                    handleUnknownEthereumError(error);
                });
            }
            if (transfer.args.temporary) {
                if (accounts.indexOf(from) !== -1) {
                    this._updateTemporaryBalance(issuanceID, from, to).catch((error) => {
                        handleUnknownEthereumError(error);
                    });
                }
            }
        });

        EthNotificationCenter.onNewReclaim(licenseContractAddress, accounts, (reclaim) => {
            const issuanceNumber = reclaim.args.issuanceNumber.toNumber();
            const issuanceID = IssuanceID.fromComponents(licenseContractAddress, issuanceNumber);
            const from = reclaim.args.from;
            const to = reclaim.args.to;

            for (const address of [from, to]) {
                this._updateBalanceForIssuanceAndAddress(issuanceID, address).catch((error) => {
                    handleUnknownEthereumError(error);
                });
            }

            if (accounts.indexOf(to) !== -1) {
                this._updateTemporaryBalance(issuanceID, to, from).catch((error) => {
                    handleUnknownEthereumError(error);
                });
            }
        });
    }
}