import {EthNotificationCenter} from "./EthNotificationCenter";
import {PersistentMinimongo2} from 'meteor/frozeman:persistent-minimongo2'
import {handleUnknownEthereumError} from "../ErrorHandling";
import {PersistentCollections} from "../PersistentCollections";

export const TransactionType = {
    Transfer: 0,
    Reclaim: 1,
    LicenseContractCreation: 2
};

export class Transactions {
    constructor() {
        const transactions = PersistentCollections.transactions;
        this._transactions = transactions;

        this._transactions.find({blockNumber: null}).observe({
            added(transaction) {
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
                transactionHash: transactionHash,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - 5, // TODO: Magic number
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * Return the latest license contract creation transactions, sorted descending by the submission date
     * @param {number} limit Only return the latest `limit` transaction. Set to `0` to return all transactions
     * @return {Mongo.Cursor}
     */
    getLatestLicenseContractCreations(limit) {
        const query = {
            transactionType: TransactionType.LicenseContractCreation
        };
        return this._transactions.find(query, {sort: {timestamp: -1}, limit: limit});
    }
}