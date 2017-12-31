import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

export const TransferTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'transferTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.transferTransactionInfo.onCreated(function() {
    this.data.transaction = new ReactiveVar({});
    Tracker.autorun(() => {
        const transaction = lob.transactions.getTransaction(this.data.transactionHash);
        this.data.transaction.set(transaction);
    });

    this.data.web3Transaction = new ReactiveVar({});
    Tracker.autorun(() => {
        web3.eth.getTransaction(this.data.transactionHash, (error, transaction) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.data.web3Transaction.set(transaction);
        });
    })
});

Template.transferTransactionInfo.helpers({
    reclaim() {
        return this.transaction.get().transactionType === TransactionType.Reclaim;
    },
    reclaimable() {
        return this.transaction.get().transactionType === TransactionType.Transfer && this.transaction.get().reclaimable;
    },
    transactionHash() {
        return this.transactionHash;
    },
    issuanceDescription() {
        const licenseContract = this.transaction.get().licenseContract;
        const issuanceID = this.transaction.get().issuanceID;
        const issuanceLocation = IssuanceLocation.fromComponents(licenseContract, issuanceID);
        return lob.issuances.getIssuance(issuanceLocation).description;
    },
    from() {
        return this.transaction.get().from;
    },
    to() {
        return this.transaction.get().to;
    },
    amount() {
        return this.transaction.get().amount;
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

Template.transferTransactionInfo.events({
    'click a.showIssuanceInfo'() {
        const transaction = this.transaction.get();
        const issuanceLocation = IssuanceLocation.fromComponents(transaction.licenseContract, transaction.issuanceID);
        IssuanceInfo.show(issuanceLocation);
    },
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});