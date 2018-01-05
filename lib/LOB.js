import {handleUnknownEthereumError} from "./ErrorHandling";
import {getRootContract} from "./lob/contractRetrieval";
import {EthNotificationCenter} from "./lob/EthNotificationCenter";
import {Balances} from "./lob/Balances";
import {Transfer} from "./lob/Transfer";
import {LicenseIssuing} from "./lob/LicenseIssuing";
import {LicenseContracts} from "./lob/LicenseContracts";
import {Issuances} from "./lob/Issuances";
import {Transactions} from "./lob/Transactions";

class LOB {
    constructor() {
        this.transactions = new Transactions();
        this.balances = new Balances(this.transactions);
        this.transfer = new Transfer(this.transactions);
        this.licenseIssuing = new LicenseIssuing(this.transactions);
        this.licenseContracts = new LicenseContracts();
        this.issuances = new Issuances(this.licenseContracts);
    }

    /**
     * @param {string[]} rootContractAddresses
     * @param {string[]} accounts
     */
    watchRootContractForBalances(rootContractAddresses, accounts) {
        // TODO: Check which root contract, address combinations are already watched for balances
        this._forEachLicenseContract(rootContractAddresses, (licenseContractAddress, rootContractAddress) => {
            this.balances.updateAllRelevantBalancesForLicenseContract(licenseContractAddress, accounts);
            this.balances.watchLicenseContractForNewBalances(licenseContractAddress, accounts);
        });
    }

    /**
     * @param {string[]} rootContractAddresses
     */
    watchRootContractsForManagedLicenseContracts(rootContractAddresses) {
        this._forEachLicenseContract(rootContractAddresses, (licenseContractAddress, rootContractAddress) => {
            this.licenseContracts.registerLicenseContract(licenseContractAddress, rootContractAddress);
        });
    }

    /**
     * Calls the callback once for each license contract under the given root contract. If a new license contract is
     * created, the callback is called again.
     *
     * @param {string[]} rootContractAddresses The root contracts for which to enumerate all license contracts
     * @param {function(string, string)} callback Called once with each license contract address with the license
     *                                            contract's address as the first parameter and the root contract's
     *                                            address as the second parameter
     * @private
     */
    _forEachLicenseContract(rootContractAddresses, callback) {
        // TODO: Cache license contracts of root contract and augument based on events
        for (const rootContractAddress of rootContractAddresses) {
            const rootContract = getRootContract(rootContractAddress);
            rootContract.licenseContractCount((error, licenseContractCount) => {
                if (error) { handleUnknownEthereumError(error); return; }
                for (let i = 0; i < licenseContractCount.toNumber(); i++) {
                    rootContract.licenseContracts(i, (error, licenseContractAddress) => {
                        if (error) { handleUnknownEthereumError(error); return; }
                        licenseContractAddress = licenseContractAddress.toLowerCase();
                        callback(licenseContractAddress, rootContractAddress);
                    });
                }
            });

            EthNotificationCenter.onLicenseContractCreation(rootContractAddress, (event) => {
                const licenseContractAddress = event.args.licenseContractAddress;
                callback(licenseContractAddress, rootContractAddress);
            });

        }
    }

    computeBalanceSnapshots(transfers) {
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
        return snapshots;
    }
}

export const lob = new LOB();
