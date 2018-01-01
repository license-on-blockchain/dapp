import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

export const LicenseContractSigningTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'licenseContractSigningTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.licenseContractSigningTransactionInfo.onCreated(function() {
    this.computations = new Set();

    const transactionHash = this.data.transactionHash;

    // Fake a reactive var that is just a reference
    this.data.transaction = {
        get() {
            return lob.transactions.getTransaction(transactionHash);
        }
    };

    this.data.web3Transaction = new ReactiveVar({});
    const web3TransactionComputation = Tracker.autorun(() => {
        web3.eth.getTransaction(this.data.transactionHash, (error, transaction) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.data.web3Transaction.set(transaction);
        });
    });
    this.computations.add(web3TransactionComputation);
});

Template.licenseContractSigningTransactionInfo.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.licenseContractSigningTransactionInfo.helpers({
    licenseContract() {
        return this.transaction.get().licenseContract;
    },
    from() {
        return this.transaction.get().from;
    },
    submissionDate() {
        return formatDate(new Date(this.transaction.get().timestamp));
    },
    blockNumber() {
        return this.transaction.get().blockNumber;
    },
    confirmations() {
        return EthBlocks.latest.number - this.transaction.get().blockNumber;
    },
    transactionFee() {
        const gasPrice = this.web3Transaction.get().gasPrice;
        if (gasPrice) {
            return web3.fromWei(gasPrice.mul(this.web3Transaction.get().gas)).toNumber();
        } else {
            return "…";
        }
    }
});

Template.licenseContractSigningTransactionInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});