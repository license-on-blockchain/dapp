import {ReactiveMap} from "../ReactiveMap";
import {getLicenseContract, getRootContract} from "./contractRetrieval";
import {IssuanceLocation} from "../IssuanceLocation";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {getAccounts} from "../Accounts";

/**
 * The balance of multiple accounts for one issuance location
 */
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

export class OpenReclaims {
    constructor() {
        // IssuanceLocation => Current owner => Int
        this._data = new ReactiveMap(() => {
            // Current owner => ReactiveVar<Int>
            return new ReactiveMap(() => {
                return new ReactiveVar(0);
            });
        });
    }

    /**
     * Get all issuance locations that may be reclaimable.
     * @returns {IssuanceLocation[]}
     */
    getReclaimableIssuanceLocations() {
        return Object.keys(this._data.get()).map((key) => IssuanceLocation.fromString(key));
    }

    /**
     * Get all addresses from which licenses of the given issuance location may be reclaimable.
     * @param {IssuanceLocation} issuanceLocation
     * @returns {string[]}
     */
    getReclaimOrigins(issuanceLocation) {
        return Object.keys(this._data.getKey(issuanceLocation).get());
    }

    /**
     * Get the number of licenses of the given issuance location that can be reclaimed from any address.
     * @param {IssuanceLocation} issuanceLocation
     * @returns {number}
     */
    getReclaimableBalance(issuanceLocation) {
        return Object.entries(this._data.getKey(issuanceLocation).get())
            .map(([key, value]) => value.get())
            .reduce((a, b) => a + b, 0);
    }

    /**
     * Get the number of licenses of the given issuance location that can be reclaimed from the given address.
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} currentOwner
     * @returns {number}
     */
    getReclaimableBalanceFrom(issuanceLocation, currentOwner) {
        return this._data.getKey(issuanceLocation).getKey(currentOwner).get();
    }

    /**
     * Set the number of licenses of the given issuance location that can be reclaimed from the given address.
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} currentOwner
     * @param {number} newReclaimableBalance
     */
    setReclaimableBalanceFrom(issuanceLocation, currentOwner, newReclaimableBalance) {
        this._data.updateKey(issuanceLocation, (issuanceLocationMap) => {
            issuanceLocationMap.updateKey(currentOwner, (reclaimableBalance) => {
                reclaimableBalance.set(newReclaimableBalance);
                return reclaimableBalance;
            });
            return issuanceLocationMap;
        });
    }
}

export class Balances {
    constructor() {
        this._watchedIssuances = new ReactiveMap(() => {
            return new Balance();
        });

        // Original owner => IssuanceLocation => Current owner => Int
        this._openReclaims = new ReactiveMap(() => {
            return new OpenReclaims();
        });
        /// address => Set<IssuanceLocation>
        this._relevantIssuances = new ReactiveMap(() => {
            return new Set();
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {Balance} A balances object
     */
    getBalanceForIssuanceLocation(issuanceLocation) {
        return this._watchedIssuances.getKey(issuanceLocation);
    }

    /**
     * @param {string} reclaimer
     * @returns {OpenReclaims}
     */
    getOpenReclaims(reclaimer) {
        return this._openReclaims.getKey(reclaimer);
    }

    /**
     * @param {string|string[]} addresses The address(es) for which relevant issuances shall be retrieved
     * @returns {IssuanceLocation[]}
     */
    getRelevantIssuanceLocations(addresses) {
        // TODO: This does not really belong here
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
            if (error) {
                handleUnknownEthereumError(error);
                return;
            }
            this._openReclaims.updateKey(originalOwner, (openReclaims) => {
                openReclaims.setReclaimableBalanceFrom(issuanceLocation, currentOwner, reclaimableBalance.toNumber());
                return openReclaims;
            });
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

        this._relevantIssuances.updateKey(accountAddress, (oldValue) => {
            oldValue.add(issuanceLocation);
            return oldValue;
        });

        licenseContract.balance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) {
                handleUnknownEthereumError(error);
                return;
            }

            this._watchedIssuances.updateKey(issuanceLocation, (issuance) => {
                issuance.setBalance(accountAddress, balance);
                return issuance;
            });
        });

        licenseContract.reclaimableBalance(issuanceLocation.issuanceID, accountAddress, (error, balance) => {
            if (error) {
                handleUnknownEthereumError(error);
                return;
            }

            this._watchedIssuances.updateKey(issuanceLocation, (issuance) => {
                issuance.setBorrowedBalance(accountAddress, balance);
                return issuance;
            });
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