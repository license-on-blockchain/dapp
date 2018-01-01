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

    watchLicenseContract(licenseContractAddress, rootContractAddress) {
        this.licenseContracts.registerLicenseContract(licenseContractAddress, rootContractAddress);

        this.balances.updateAllRelevantBalancesForLicenseContract(licenseContractAddress);
        this.balances.watchLicenseContractForNewBalances(licenseContractAddress);
    }

    watchRootContract(rootContractAddress) {
        const rootContract = getRootContract(rootContractAddress);

        rootContract.licenseContractCount((error, licenseContractCount) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < licenseContractCount.toNumber(); i++) {
                rootContract.licenseContracts(i, (error, licenseContractAddress) => {
                    if (error) { handleUnknownEthereumError(error); return; }
                    licenseContractAddress = licenseContractAddress.toLowerCase();
                    this.watchLicenseContract(licenseContractAddress, rootContractAddress);
                });
            }
        });

        EthNotificationCenter.onLicenseContractCreation(rootContractAddress, (event) => {
            this.watchLicenseContract(event.args.licenseContractAddress, rootContractAddress);
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
