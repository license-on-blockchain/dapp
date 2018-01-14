import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {formatDate} from "../../lib/utils";

Template.generalTransactionInfo.onCreated(function() {
    this.computations = new Set();

    const transactionHash = this.data.transaction.transactionHash;

    this.data.web3Transaction = new ReactiveVar({});
    const web3TransactionComputation = Tracker.autorun(() => {
        web3.eth.getTransaction(transactionHash, (error, transaction) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.data.web3Transaction.set(transaction);
        });
    });
    this.computations.add(web3TransactionComputation);

    this.data.web3TransactionReceipt = new ReactiveVar({});
    const web3TransactionReceiptComputation = Tracker.autorun(() => {
        web3.eth.getTransactionReceipt(transactionHash, (error, transaction) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.data.web3TransactionReceipt.set(transaction);
        });
    });
    this.computations.add(web3TransactionReceiptComputation);
});

Template.generalTransactionInfo.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.generalTransactionInfo.helpers({
    submissionDate() {
        return formatDate(new Date(this.transaction.timestamp));
    },
    blockNumber() {
        return this.transaction.blockNumber;
    },
    confirmations() {
        return EthBlocks.latest.number - this.transaction.blockNumber + 1;
    },
    transactionStatus() {
        const web3Transaction = this.web3TransactionReceipt.get();
        if (web3Transaction) {
            if (web3Transaction.status === '0x1') {
                return TAPi18n.__('generic.transactionStatus.success');
            } else {
                return TAPi18n.__('generic.transactionStatus.failed');
            }
        } else {
            return TAPi18n.__('generic.transactionStatus.pending');
        }
    },
    transactionFee() {
        const gasPrice = this.web3Transaction.get().gasPrice;
        if (gasPrice) {
            return web3.fromWei(gasPrice.mul(this.web3Transaction.get().gas)).toNumber();
        } else {
            return "…";
        }
    },
});