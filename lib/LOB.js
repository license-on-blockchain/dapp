import { ReactiveMap } from './ReactiveMap';
import { Issuance } from "./Issuance";
import { handleUnknownEthereumError } from "./ErrorHandling";
import { promisify } from "./utils";
import './init.js';

const getAccounts = function(callback) {
    web3.eth.getAccounts(callback);
    // console.log(web3.eth.accounts);
    // return web3.eth.accounts;
};

class LOB {
    constructor() {
        this.allWatchedIssuances = new ReactiveMap(() => {
            return {
                balance: new ReactiveMap(() => {
                    return new BigNumber(0);
                }),
                reclaimableBalance: new ReactiveMap(() => {
                    return new BigNumber(0);
                }),
                properBalance(account) {
                    return this.balance.getKey(account).minus(this.reclaimableBalance.getKey(account));
                }
            };
        });
    }

    getRootContract(address) {
        const abiDescription = [{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdrawFromLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"newFee","type":"uint128"}],"name":"setLicenseContractFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"defaultFee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"licenseContractCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuerName","type":"string"},{"name":"liability","type":"string"},{"name":"safekeepingPeriod","type":"uint8"},{"name":"issuerCertificate","type":"bytes"}],"name":"createLicenseContract","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newDefaultFee","type":"uint128"}],"name":"setDefaultFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"}],"name":"disableLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"licenseContracts","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"licenseContractAddress","type":"address"}],"name":"LicenseContractCreation","type":"event"},{"anonymous":false,"inputs":[],"name":"Disabled","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        return abi.at(address);
    }

    getLicenseContract(address) {
        const abiDescription = [{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"balance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"reclaimableBalance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transferAndAllowReclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"}],"name":"revoke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuerName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newFee","type":"uint128"}],"name":"setFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"},{"name":"reclaimer","type":"address"}],"name":"reclaimableBalanceBy","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"signature","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerCertificate","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"liability","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"from","type":"address"},{"name":"amount","type":"uint64"}],"name":"reclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_signature","type":"bytes"}],"name":"sign","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"relevantIssuances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"relevantIssuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"certificateText","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lobRoot","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"safekeepingPeriod","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"numLicenses","type":"uint64"},{"name":"auditRemark","type":"string"},{"name":"auditTime","type":"uint32"},{"name":"initialOwner","type":"address"}],"name":"issueLicense","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"fee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"issuances","outputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"originalSupply","type":"uint64"},{"name":"auditTime","type":"uint32"},{"name":"auditRemark","type":"string"},{"name":"revoked","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_issuer","type":"address"},{"name":"_issuerName","type":"string"},{"name":"_liability","type":"string"},{"name":"_issuerCertificate","type":"bytes"},{"name":"_safekeepingPeriod","type":"uint8"},{"name":"_fee","type":"uint128"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Issuing","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"},{"indexed":false,"name":"reclaimable","type":"bool"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"}],"name":"Reclaim","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newFee","type":"uint128"}],"name":"FeeChange","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        return abi.at(address);
    }

    watchLicenseContract(contractAddress) {
        contractAddress = contractAddress.toLowerCase();
        const licenseContract = this.getLicenseContract(contractAddress);

        licenseContract.issuancesCount((error, issuancesCount) => {
            if (error) { handleUnknownEthereumError(error); return; }

            for (let issuanceID = 0; issuanceID < issuancesCount.toNumber(); issuanceID++) {
                this.watchIssuance(licenseContract, issuanceID);
            }
        });

        licenseContract.Issuing({}, {fromBlock: 'latest'}).watch((error, issuing) => {
            if (error) { handleUnknownEthereumError(error); return; }

            this.watchIssuance(licenseContract, issuing.args.issuanceID);
        });

        // Listen for balance updates
        licenseContract.Transfer({}, {fromBlock: 'latest'}).watch((error, transfer) => {
            if (error) { handleUnknownEthereumError(error); return; }
            getAccounts((error, accounts) => {
                if (error) { handleUnknownEthereumError(error); return; }
                for (const address of [transfer.args.from, transfer.args.to]) {
                    if (accounts.indexOf(address) !== -1) { // Ignore if it doesn't affect us
                        this.updateBalance(licenseContract, transfer.args.issuanceID.toNumber(), address);
                    }
                }
            });
        });

        // Listen for updates to the revoked status
        licenseContract.Revoke({}, {fromBlock: 'latest'}).watch((error, revoke) => {
            const issuanceID = revoke.args.issuanceID.toNumber();
            if (this.allWatchedIssuances.hasKey([contractAddress, issuanceID])) {
                this.allWatchedIssuances.getKey([contractAddress, issuanceID]).revoked.set(true);
            }
        });
    }

    watchRootContract(contractAddress) {
        const rootContract = this.getRootContract(contractAddress);

        rootContract.licenseContractCount((error, licenseContractCount) => {
            if (error) { handleUnknownEthereumError(error); return; }
            for (let i = 0; i < licenseContractCount.toNumber(); i++) {
                rootContract.licenseContracts(i, (error, licenseContractAddress) => {
                    if (error) { handleUnknownEthereumError(error); return; }
                    this.watchLicenseContract(licenseContractAddress);
                });
            }
        });

        rootContract.LicenseContractCreation({}, {fromBlock: 'latest'}).watch((error, creation) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.watchLicenseContract(creation.args.licenseContractAddress);
        });
    }

    watchIssuance(licenseContract, issuanceID) {
        getAccounts((error, accounts) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // Retrieve initial balances. If a balance is non-zero and metadata is missing, metadata will be retrieved
            for (const address of accounts) {
                this.updateBalance(licenseContract, issuanceID, address);
            }
        });
    }

    updateBalance(licenseContract, issuanceID, accountAddress) {
        const callback = (issuanceKey, error, balance) => {
            if (error) { handleUnknownEthereumError(error); return; }

            if (!this.allWatchedIssuances.hasKey([licenseContract.address, issuanceID]) && balance.isZero()) {
                // Don't add an entry if balance is zero
                return;
            }

            this.allWatchedIssuances.updateKey([licenseContract.address, issuanceID], (issuance) => {
                issuance[issuanceKey].setKey(accountAddress, balance);
                return issuance;
            });

            if (typeof this.allWatchedIssuances.getKey([licenseContract.address, issuanceID]).issuanceID === 'undefined') {
                this.fetchIssuanceMetadata(licenseContract, issuanceID);
            }
        };

        licenseContract.balance(issuanceID, accountAddress, (error, balance) => {
            callback("balance", error, balance);
        });

        licenseContract.reclaimableBalance(issuanceID, accountAddress, (error, balance) => {
            callback("reclaimableBalance", error, balance);
        });
    }

    fetchIssuanceMetadata(licenseContract, issuanceID) {
        licenseContract.issuances(issuanceID, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }

            // Update issuance metadata
            const issuanceObj = new Issuance(value);
            this.allWatchedIssuances.updateKey([licenseContract.address, issuanceID], (issuance) => {
                issuance.issuanceID = issuanceID;
                issuance.licenseContract = licenseContract.address;
                issuance.description = issuanceObj.description;
                issuance.code = issuanceObj.code;
                issuance.originalOwner = issuanceObj.originalOwner;
                issuance.originalSupply = issuanceObj.originalSupply;
                issuance.auditTime = issuanceObj.auditTime;
                issuance.auditRemark = issuanceObj.auditRemark;
                issuance.revoked = new ReactiveVar(issuanceObj.revoked);
                return issuance;
            });
        });
    }

    transferLicense(licenseContractAddress, issuanceID, from, to, amount, gasPrice, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        return licenseContract.transfer(issuanceID, to, amount, { from, gasPrice }, callback);
    }

    estimateGasTransferLicense(licenseContractAddress, issuanceID, from, to, amount, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        licenseContract.transfer.estimateGas(issuanceID, to, amount, { from }, callback);
    }

    transferLicenseAndAllowReclaim(licenseContractAddress, issuanceID, from, to, amount, gasPrice, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        return licenseContract.transferAndAllowReclaim(issuanceID, to, amount, { from, gasPrice }, callback);
    }

    estimateGasTransferLicenseAndAllowReclaim(licenseContractAddress, issuanceID, from, to, amount, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        licenseContract.transferAndAllowReclaim.estimateGas(issuanceID, to, amount, { from }, callback);
    }

    getCertificateText(licenseContractAddress, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        licenseContract.certificateText(callback);
    }

    getIssuance(licenseContractAddress, issuanceID, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        licenseContract.issuances(issuanceID, (error, issuance) => {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, new Issuance(issuance));
        })
    }

    getIssuerCertificate(licenseContractAddress, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
        licenseContract.issuerCertificate(callback);
    }

    getLicenseTransfers(licenseContractAddress, issuanceID, callback) {
        const licenseContract = this.getLicenseContract(licenseContractAddress);
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
