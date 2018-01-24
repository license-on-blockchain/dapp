import {EthNotificationCenter} from "./EthNotificationCenter";
import {PersistentMinimongo2} from 'meteor/frozeman:persistent-minimongo2'
import {handleUnknownEthereumError} from "../ErrorHandling";
import {PersistentCollections} from "../PersistentCollections";
import {Accounts} from "../Accounts";
import {IssuanceID} from "../IssuanceID";

export const TransactionType = {
    Transfer: 0,
    Reclaim: 1,
    LicenseContractCreation: 2,
    LicenseContractSigning: 3,
    LicenseContractDisabling: 4,
    LicenseIssuing: 5,
    IssuanceRevoke: 6,
};

// The number of blocks prior to the current block where watching for updates to the transaction should start. This is
// needed since a new block might have been committed while the transaction was being submitted. The value of 5 is
// arbitrary.
const miningCheckpointLookBack = 5;

export class Transactions {
    constructor() {
        this._network = new ReactiveVar(null);
        if (Meteor.isClient && typeof web3 !== 'undefined') {
            web3.version.getNetwork((error, network) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this._network.set(network);
            });
        }

        const transactions = PersistentCollections.transactions;
        this._transactions = transactions;

        this._transactions.find({blockNumber: null}).observe({
            added(transaction) {
                // Check status via getTransaction to update status of failed transactions
                web3.eth.getTransaction(transaction.transactionHash, (error, web3Transaction) => {
                    if (error) { handleUnknownEthereumError(error); return; }
                    transactions.update({transactionHash: transaction.transactionHash}, {$set: {
                        blockNumber: web3Transaction.blockNumber
                    }});
                });
                let eventHandle;
                switch (transaction.transactionType) {
                    case TransactionType.Transfer:
                        eventHandle = EthNotificationCenter.onNewTransfer(transaction.licenseContract, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.Reclaim:
                        eventHandle = EthNotificationCenter.onNewReclaim(transaction.licenseContract, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseContractCreation:
                        eventHandle = EthNotificationCenter.onLicenseContractCreation(transaction.rootContract, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber,
                                    licenseContract: event.args.licenseContractAddress
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseContractSigning:
                        eventHandle = EthNotificationCenter.onLicenseContractSigning(transaction.licenseContract, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseContractDisabling:
                        eventHandle = EthNotificationCenter.onLicenseContractDisabling(transaction.licenseContract, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.LicenseIssuing:
                        eventHandle = EthNotificationCenter.onNewIssuing(transaction.licenseContract, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                    case TransactionType.IssuanceRevoke:
                        const issuanceID = IssuanceID.fromComponents(transaction.licenseContract, Number(transaction.issuanceNumber));
                        eventHandle = EthNotificationCenter.onRevoke(issuanceID, (event) => {
                            if (event.transactionHash === transaction.transactionHash) {
                                eventHandle.stopWatching();
                                transactions.update({transactionHash: event.transactionHash}, {$set: {
                                    blockNumber: event.blockNumber
                                }});
                            }
                        }, transaction.watchForMiningCheckpoint);
                        break;
                }
            }
        })
    }

    _getCurrentBlockAndNetwork(callback) {
        web3.eth.getBlockNumber((error, blockNumber) => {
            if (error) { handleUnknownEthereumError(error); return; }
            web3.version.getNetwork((error, network) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(blockNumber, network);
            });
        });
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {boolean} reclaimable
     * @param {string} transactionHash
     */
    addPendingTransfer(issuanceID, from, to, amount, reclaimable, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.Transfer,
                licenseContract: issuanceID.licenseContractAddress,
                issuanceNumber: issuanceID.issuanceNumber,
                from: from,
                to: to,
                amount: amount,
                reclaimable: reclaimable,
                submittedBy: from,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
                timestamp: (new Date()).getTime()
            });
        });
    }

    addPendingReclaim(issuanceID, from, reclaimer, amount, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.Reclaim,
                licenseContract: issuanceID.licenseContractAddress,
                issuanceNumber: issuanceID.issuanceNumber,
                from: from,
                to: reclaimer,
                amount: amount,
                submittedBy: reclaimer,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * @param {string} transactionHash
     * @return {object}
     */
    getTransaction(transactionHash) {
        return this._transactions.findOne({_id: transactionHash});
    }

    /**
     * Return the latest transfer transactions, sorted descending by the submission date
     * @param {number} limit Only return the latest `limit` transaction. Set to `0` to return all transactions
     * @return {Mongo.Cursor}
     */
    getLatestTransfers(limit) {
        return this._transactions.find({
            transactionType: {$in: [TransactionType.Transfer, TransactionType.Reclaim]},
            submittedBy: {$in: Accounts.get()},
            network: this._network.get()
        }, {sort: {timestamp: -1}, limit: limit});
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string|string[]} accounts
     * @return {number}
     */
    getPendingBalance(issuanceID, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            transactionType: TransactionType.Transfer,
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            blockNumber: null,
            from: {$in: accounts},
            network: this._network.get()
        };
        return this._transactions.find(query)
            .map((transaction) => -transaction.amount)
            .reduce((x, y) => x + y, 0);
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string|string[]}accounts
     * @returns {number}
     */
    getPendingReclaimableBalance(issuanceID, accounts) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            transactionType: TransactionType.Reclaim,
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            blockNumber: null,
            to: {$in: accounts},
            network: this._network.get()
        };
        return this._transactions.find(query)
            .map((transaction) => -transaction.amount)
            .reduce((x, y) => x + y, 0);
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string|string[]}accounts
     * @param {string} from
     * @returns {number}
     */
    getPendingReclaimableBalanceFrom(issuanceID, accounts, from) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }
        const query = {
            transactionType: TransactionType.Reclaim,
            licenseContract: issuanceID.licenseContractAddress,
            issuanceNumber: issuanceID.issuanceNumber,
            blockNumber: null,
            to: {$in: accounts},
            from: from,
            network: this._network.get()
        };
        return this._transactions.find(query)
            .map((transaction) => -transaction.amount)
            .reduce((x, y) => x + y, 0);
    }


    addPendingLicenseContractCreation(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerSSLCertificate, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.LicenseContractCreation,
                rootContract: rootContractAddress,
                issuerAddress: issuerAddress,
                issuerName: issuerName,
                liability: liability,
                safekeepingPeriod: safekeepingPeriod,
                issuerSSLCertificate: issuerSSLCertificate,
                submittedBy: issuerAddress,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * Return the latest license contract transactions (creation, signing, disabling, issuing, revoke), sorted
     * descending by the submission date.
     *
     * @param {number} limit Only return the latest `limit` transaction. Set to `0` to return all transactions
     * @return {Mongo.Cursor}
     */
    getAllLatestLicenseContractTransactions(limit) {
        const query = {
            transactionType: {$in: [
                TransactionType.LicenseContractCreation,
                TransactionType.LicenseContractSigning,
                TransactionType.LicenseContractDisabling,
                TransactionType.LicenseIssuing,
                TransactionType.IssuanceRevoke
            ]},
            submittedBy: {$in: Accounts.get()},
            network: this._network.get()
        };
        return this._transactions.find(query, {sort: {timestamp: -1}, limit: limit});
    }

    /**
     * Return the latest license contract transactions (creation, signing, disabling, issuing, revoke), sorted
     * descending by the submission date for one specific license contract.
     *
     * @param {string} licenseContractAddress
     * @param {number} limit Only return the latest `limit` transaction. Set to `0` to return all transactions
     * @return {Mongo.Cursor}
     */
    getLatestLicenseContractTransactions(licenseContractAddress, limit) {
        const query = {
            transactionType: {$in: [
                TransactionType.LicenseContractCreation,
                TransactionType.LicenseContractSigning,
                TransactionType.LicenseContractDisabling,
                TransactionType.LicenseIssuing,
                TransactionType.IssuanceRevoke
            ]},
            licenseContract: licenseContractAddress,
            submittedBy: {$in: Accounts.get()},
            network: this._network.get()
        };
        return this._transactions.find(query, {sort: {timestamp: -1}, limit: limit});
    }

    addPendingLicenseContractSignature(licenseContractAddress, from, signature, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.LicenseContractSigning,
                licenseContract: licenseContractAddress,
                from: from,
                signature: signature,
                submittedBy: from,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
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
            blockNumber: null,
            network: this._network.get()
        }).count() > 0;
    }

    addPendingLicenseContractDisabling(licenseContractAddress, from, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.LicenseContractDisabling,
                licenseContract: licenseContractAddress,
                from: from,
                submittedBy: from,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
                timestamp: (new Date()).getTime()
            });
        });
    }

    /**
     * Checks if there is a pending transaction that disables the given license contract
     * @param {string} licenseContractAddress
     * @return {boolean}
     */
    hasPendingDisablingTransaction(licenseContractAddress) {
        return this._transactions.find({
            transactionType: TransactionType.LicenseContractDisabling,
            licenseContract: licenseContractAddress,
            blockNumber: null,
            network: this._network.get()
        }).count() > 0;
    }

    addPendingLicenseIssuing(licenseContractAddress, description, code, amount, initialOwnerAddress, auditRemark, auditTime, from, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.LicenseIssuing,
                licenseContract: licenseContractAddress,
                from: from,
                description: description,
                code: code,
                amount: amount,
                initialOwnerAddress: initialOwnerAddress,
                auditRemark: auditRemark,
                auditTime: auditTime,
                submittedBy: from,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
                timestamp: (new Date()).getTime()
            });
        });
    }

    addPendingIssuanceRevoke(licenseContractAddress, issuanceNumber, from, transactionHash) {
        this._getCurrentBlockAndNetwork((blockNumber, network) => {
            this._transactions.insert({
                _id: transactionHash,
                transactionType: TransactionType.IssuanceRevoke,
                licenseContract: licenseContractAddress,
                issuanceNumber: issuanceNumber,
                from: from,
                submittedBy: from,
                transactionHash: transactionHash,
                network: network,
                blockNumber: null,
                watchForMiningCheckpoint: blockNumber - miningCheckpointLookBack,
                timestamp: (new Date()).getTime()
            });
        });
    }
}