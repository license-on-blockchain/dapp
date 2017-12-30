import {EthNotificationCenter} from "./EthNotificationCenter";
import {PersistentMinimongo2} from 'meteor/frozeman:persistent-minimongo2'
import {handleUnknownEthereumError} from "../ErrorHandling";

export const TransactionType = {
    Transfer: 0,
    Reclaim: 1,
};

export class Transactions {
    constructor() {
        const transactions = new Mongo.Collection('transactions', {connection: null});
        this._transactions = transactions;
        if (Meteor.isClient) {
            new PersistentMinimongo2(transactions, 'lob_wallet');
        }

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
                        console.log(transaction);
                        EthNotificationCenter.onNewReclaim(transaction.licenseContract, (event) => {
                            console.log("A");
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
     * @return {Mongo.Cursor}
     */
    getPendingTransfers() {
        return this._transactions.find({
            transactionType: {$in: [TransactionType.Transfer, TransactionType.Reclaim]},
            // blockNumber: null
        }, {sort: {timestamp: -1}});
    }

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
}