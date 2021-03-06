import {handleUnknownEthereumError} from "./ErrorHandling";
import {EthNotificationCenter} from "./lob/EthNotificationCenter";
import {Balances} from "./lob/Balances";
import {Transfer} from "./lob/Transfer";
import {LicenseIssuing} from "./lob/LicenseIssuing";
import {LicenseContracts} from "./lob/LicenseContracts";
import {Issuances} from "./lob/Issuances";
import {Transactions} from "./lob/Transactions";
import {RootContracts} from "./RootContracts";
import {Accounts} from "./Accounts";

class LOB {
    constructor() {
        this.transactions = new Transactions();
        this.balances = new Balances(this.transactions);
        this.transfer = new Transfer(this.transactions);
        this.licenseIssuing = new LicenseIssuing(this.transactions);
        this.licenseContracts = new LicenseContracts();
        this.issuances = new Issuances(this.licenseContracts);
        this.rootContracts = new RootContracts(this.licenseContracts);

        this._watchedAccounts = new Set();
    }

    /**
     * @param {string[]|string} accounts The account(s) for which the LOB balances shall be watched
     * @returns {Promise} A promise without a return value that is fulfilled when the initial balances have been loaded
     */
    watchAccountBalance(accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        accounts = accounts.filter((address) => !this._watchedAccounts.has(address));
        for (const account of accounts) {
            this._watchedAccounts.add(account);
        }

        if (accounts.length > 0) {
            return this.rootContracts.getAddresses().then((rootContracts) => {
                return this._watchRootContractForBalances(rootContracts, accounts);
            });
        } else {
            return Promise.all([]);
        }
    }

    /**
     * @param {string[]} rootContractAddresses
     * @param {string[]} accounts
     * @returns {Promise} A promise without a return value that is fulfilled when all initial balances have been loaded
     */
    _watchRootContractForBalances(rootContractAddresses, accounts) {
        const promise = this.rootContracts.getLicenseContracts(rootContractAddresses).then((addresses) => {
            const updateBalancePromises = [];
            for (const licenseContractAddress of addresses) {
                const promise = this.balances.updateAllRelevantBalancesForLicenseContract(licenseContractAddress, accounts);
                updateBalancePromises.push(promise);

                this.balances.watchLicenseContractForNewBalances(licenseContractAddress, accounts);
            }
            return Promise.all(updateBalancePromises);
        });

        for (const rootContractAddress of rootContractAddresses) {
            EthNotificationCenter.onLicenseContractCreation(rootContractAddress, (event) => {
                const licenseContractAddress = event.args.licenseContractAddress;
                this.balances.updateAllRelevantBalancesForLicenseContract(licenseContractAddress, accounts).catch((error) => {
                    handleUnknownEthereumError(error);
                });
                this.balances.watchLicenseContractForNewBalances(licenseContractAddress, accounts);
                this.licenseContracts.registerLicenseContract(licenseContractAddress, rootContractAddress, null);

            });
        }

        return promise;
    }

    watchRootContractsForManagedLicenseContracts() {
        this.rootContracts.getAddresses().then((rootContractAddresses) => {
            // Just trigger a fetch of the license contracts. As a side effect this will register them
            this.rootContracts.getLicenseContracts(rootContractAddresses)
                .then((licenseContractAddresses) => {
                    for (const licenseContractAddress of licenseContractAddresses) {
                        this.licenseContracts.getIssuerAddress(licenseContractAddress);
                    }
                })
                .catch((error) => {
                    handleUnknownEthereumError(error);
                });
        });
    }

    computeBalanceSnapshots(transfers, issuanceID) {
        const snapshots = [];
        let lastSnapshot = {};
        for (const transfer of transfers) {
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

            snapshots.push({balances: nextSnapshot, blockNumber: transfer.blockNumber});
            lastSnapshot = nextSnapshot;
        }
        // Verify that the snapshots match the balance displayed in the rest of the UI
        Tracker.nonreactive(() => {
            for (const address of Accounts.get()) {
                const balance = this.balances.getBalance(issuanceID, address);
                if (balance !== lastSnapshot[address]) {
                    throw "Latest balance snapshot not in sync with local balances";
                }
            }
        });
        return snapshots;
    }
}

export const lob = new LOB();

if (Meteor.isClient) {
    window.lob = lob;
}