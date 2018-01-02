import {EthNotificationCenter} from "./EthNotificationCenter";
import {PersistentMinimongo2} from 'meteor/frozeman:persistent-minimongo2'
import {handleUnknownEthereumError} from "../ErrorHandling";
import {PersistentCollections} from "../PersistentCollections";
import {Accounts} from "../Accounts";
import {IssuanceLocation} from "../IssuanceLocation";

export const TransactionType = {
    Transfer: 0,
    Reclaim: 1,
    LicenseContractCreation: 2,
    LicenseContractSigning: 3,
    LicenseContractDisabling: 4,
    LicenseIssuing: 5,
    IssuanceRevoke: 6,
};

export class Transactions {
    constructor() {
        const transactions = PersistentCollections.transactions;
        this._transactions = transactions;

        this._transactions.find({blockNumber: null}).observe({
            added(transaction) {
                // Check status via getTransaction to update status of failed transactions
                web3.eth.getTransaction(transaction.transactionHash, (error, web3Transaction) => {
                    transactions.update({transactionHash: transaction.transactionHash}, {$set: {
                        blockNumber: web3Transaction.blockNumber
                    }});
                });
                // TODO: Remove observer after event has been detected
                switch (transaction.transactionType) {
                    case TransactionType.Transfer:
                        EthNotificationCenter.onNewTransfer(transaction.licenseContract, (event) => {
                            transactions.update({transactionHash: event.transactionHash}, {$set: {
                                blockNumber: event.blockNumber
                            }});
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.Reclaim:
                        EthNotificationCenter.onNewReclaim(transaction.licenseContract, (event) => {
                            transactions.update({transactionHash: event.transactionHash}, {$set: {
                                blockNumber: event.blockNumber
                            }});
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseContractCreation:
                        EthNotificationCenter.onLicenseContractCreation(transaction.rootContract, (event) => {
                            transactions.update({transactionHash: event.transactionHash}, {$set: {
                                blockNumber: event.blockNumber,
                                licenseContract: event.args.licenseContractAddress
                            }});
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseContractSigning:
                        EthNotificationCenter.onLicenseContractSigning(transaction.licenseContract, (event) => {
                            transactions.update({transactionHash: event.transactionHash}, {$set: {
                                blockNumber: event.blockNumber
                            }});
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseContractDisabling:
                        break;
                    case TransactionType.LicenseIssuing:
                        // The license issuing triggers a transfer event from 0x0. So just listen for the first transfer event
                        EthNotificationCenter.onNewTransfer(transaction.licenseContract, (event) => {
                            transactions.update({transactionHash: event.transactionHash}, {$set: {
                                blockNumber: event.blockNumber
                            }});
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.IssuanceRevoke:
                        const issuanceLocation = IssuanceLocation.fromComponents(transaction.licenseContract, Number(transaction.issuanceID));
                        EthNotificationCenter.onRevoke(issuanceLocation, (event) => {
                            transactions.update({transactionHash: event.transactionHash}, {$set: {
                                blockNumber: event.blockNumber
                            }});
                        }, transaction.watchForMiningCheckpoint);
                        break;
                }
            }
        })
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {boolean} reclaimable
     * @param {string} transactionHash
     */
    addPendingTransfer(issuanceLocation, from, to, amount, reclaimable, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.Transfer,
                licenseContract: issuanceLocation.licenseContractAddress,
                issuanceID: issuanceLocation.issuanceID,
                from: from,
                to: to,
                amount: amount,
                reclaimable: reclaimable,
                submittedBy: from,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    addPendingReclaim(issuanceLocation, from, reclaimer, amount, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.Reclaim,
                licenseContract: issuanceLocation.licenseContractAddress,
                issuanceID: issuanceLocation.issuanceID,
                from: from,
                to: reclaimer,
                amount: amount,
                submittedBy: reclaimer,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * @param {string} transactionHash
     * @return {object}
     */
    getTransaction(transactionHash) {
        return this._transactions.findOne({transactionHash});
    }

    /**
     * Return the latest transfer transactions, sorted descending by the submission date
     * @param {number} limit Only return the latest `limit` transaction. Set to `0` to return all transactions
     * @return {Mongo.Cursor}
     */
    getLatestTransfers(limit) {
        return this._transactions.find({
            transactionType: {$in: [TransactionType.Transfer, TransactionType.Reclaim]},
            submittedBy: {$in: Accounts.get()}
        }, {sort: {timestamp: -1}, limit: limit});
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string|string[]} accounts
     * @return {number}
     */
    getPendingBalanceChange(issuanceLocation, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            transactionType: TransactionType.Transfer,
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            blockNumber: null,
            from: {$in: accounts},
        };
        return this._transactions.find(query)
            .map((transaction) => -transaction.amount)
            .reduce((x, y) => x + y, 0);
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string|string[]}accounts
     * @returns {number}
     */
    getPendingReclaimableBalance(issuanceLocation, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            transactionType: TransactionType.Reclaim,
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            blockNumber: null,
            to: {$in: accounts},
        };
        return this._transactions.find(query)
            .map((transaction) => -transaction.amount)
            .reduce((x, y) => x + y, 0);
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string|string[]}accounts
     * @param {string} from
     * @returns {number}
     */
    getPendingReclaimableBalanceFrom(issuanceLocation, accounts, from) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            transactionType: TransactionType.Reclaim,
            licenseContract: issuanceLocation.licenseContractAddress,
            issuanceID: issuanceLocation.issuanceID,
            blockNumber: null,
            to: {$in: accounts},
            from: from
        };
        return this._transactions.find(query)
            .map((transaction) => -transaction.amount)
            .reduce((x, y) => x + y, 0);
    }


    addPendingLicenseContractCreation(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.LicenseContractCreation,
                rootContract: rootContractAddress,
                issuerAddress: issuerAddress,
                issuerName: issuerName,
                liability: liability,
                safekeepingPeriod: safekeepingPeriod,
                issuerCertificate: issuerCertificate,
                submittedBy: issuerAddress,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * Return the latest license contract transactions (creation, signing, disabling, issuing, revoke), sorted descending by the
     * submission date
     * @param {number} limit Only return the latest `limit` transaction. Set to `0` to return all transactions
     * @return {Mongo.Cursor}
     */
    getLatestLicenseContractTransactions(limit) {
        const query = {
            transactionType: {$in: [
                TransactionType.LicenseContractCreation,
                TransactionType.LicenseContractSigning,
                TransactionType.LicenseContractDisabling,
                TransactionType.LicenseIssuing,
                TransactionType.IssuanceRevoke
            ]},
            submittedBy: {$in: Accounts.get()}
        };
        return this._transactions.find(query, {sort: {timestamp: -1}, limit: limit});
    }

    addPendingLicenseContractSignature(licenseContractAddress, from, signature, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.LicenseContractSigning,
                licenseContract: licenseContractAddress,
                from: from,
                signature: signature,
                submittedBy: from,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * Checks if there is a pending transaction signing the given license contract
     * @param {string} licenseContractAddress
     * @returns {boolean}
     */
    hasPendingSigningTransaction(licenseContractAddress) {
        return this._transactions.find({
            transactionType: TransactionType.LicenseContractSigning,
            licenseContract: licenseContractAddress,
            blockNumber: null
        }).count() > 0;
    }

    addPendingLicenseContractDisabling(licenseContractAddress, from, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.LicenseContractDisabling,
                licenseContract: licenseContractAddress,
                from: from,
                submittedBy: from,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    addPendingLicenseIssuing(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.LicenseIssuing,
                licenseContract: licenseContractAddress,
                from: from,
                description: description,
                code: code,
                amount: amount,
                initialOwnerAddress: initialOwnerAddress,
                initialOwnerName: initialOwnerName,
                auditRemark: auditRemark,
                auditTime: auditTime,
                submittedBy: from,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    addPendingIssuanceRevoke(licenseContractAddress, issuanceID, from, transactionHash) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._transactions.insert({
                transactionType: TransactionType.IssuanceRevoke,
                licenseContract: licenseContractAddress,
                issuanceID: issuanceID,
                from: from,
                submittedBy: from,
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }
}