import { handleUnknownEthereumError } from "./ErrorHandling";
import { LazyReactiveVar } from "./LazyReactiveVar";
import { IssuanceLocation } from "./IssuanceLocation";
import { Balances } from "./lob/Balances";
import './init.js';
import {Transfer} from "./lob/Transfer";
import {LicenseIssuing} from "./lob/LicenseIssuing";
import {getLicenseContract, getRootContract} from "./lob/contractRetrieval";
import {EthNotificationCenter} from "./lob/EthNotificationCenter";
import {LicenseContracts} from "./lob/LicenseContracts";
import {Issuances} from "./lob/Issuances";
import {getAccounts} from "./Accounts";

class LOB {
    constructor() {
        this.accounts = new LazyReactiveVar([], (callback) => {
            getAccounts((value) => {
                callback(value);
            });
        });

        this.balances = new Balances();
        this.transfer = new Transfer(this.balances);
        this.licenseIssuing = new LicenseIssuing();
        this.licenseContracts = new LicenseContracts();
        this.issuances = new Issuances(this.licenseContracts);
    }

    /**
     * @param {string|string[]} addresses The address(es) for which relevant issuances shall be retrieved
     * @returns {IssuanceLocation[]}
     */
    getRelevantIssuanceLocations(addresses) {
        return this.balances.getRelevantIssuanceLocations(addresses);
    }

    watchLicenseContract(licenseContractAddress) {
        licenseContractAddress = licenseContractAddress.toLowerCase();
        const licenseContract = getLicenseContract(licenseContractAddress);

        // TODO: Only do this if issuer tools are enabled
        licenseContract.issuer((error, issuerAddress) => {
            if (error) { handleUnknownEthereumError(error); return; }
            issuerAddress = issuerAddress.toLowerCase();
            this.licenseContracts.registerOwnedLicenseContract(issuerAddress, licenseContractAddress);
        });

        this.balances._updateAllRelevantBalancesForLicenseContract(licenseContractAddress);
        this.balances._watchLicenseContractForNewBalances(licenseContractAddress);
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

        EthNotificationCenter.onLicenseContractCreation(rootContractAddress, (licenseContractAddress) => {
            this.watchLicenseContract(licenseContractAddress);
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
