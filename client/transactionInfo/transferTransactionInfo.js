import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceID} from "../../lib/IssuanceID";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";
import {AccountInfo} from "../shared/accountInfo";

export const TransferTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'transferTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.transferTransactionInfo.helpers({
    reclaim() {
        return lob.transactions.getTransaction(this.transactionHash).transactionType === TransactionType.Reclaim;
    },
    reclaimable() {
        const transaction = lob.transactions.getTransaction(this.transactionHash);
        return transaction.transactionType === TransactionType.Transfer && transaction.reclaimable;
    },
    transactionHash() {
        return this.transactionHash;
    },
    issuanceDescription() {
        const transaction = lob.transactions.getTransaction(this.transactionHash);
        const licenseContract = transaction.licenseContract;
        const issuanceNumber = transaction.issuanceNumber;
        const issuanceID = IssuanceID.fromComponents(licenseContract, issuanceNumber);
        return lob.issuances.getIssuance(issuanceID).description;
    },
    from() {
        return lob.transactions.getTransaction(this.transactionHash).from;
    },
    to() {
        return lob.transactions.getTransaction(this.transactionHash).to;
    },
    amount() {
        return lob.transactions.getTransaction(this.transactionHash).amount;
    },
    transaction() {
        return lob.transactions.getTransaction(this.transactionHash);
    },
    etherscanUrl() {
        return Etherscan.getUrlForTransaction(this.transactionHash);
    }
});

Template.transferTransactionInfo.events({
    'click a.showIssuanceInfo'(event) {
        event.preventDefault();
        const transaction = lob.transactions.getTransaction(this.transactionHash);
        const issuanceID = IssuanceID.fromComponents(transaction.licenseContract, transaction.issuanceNumber);
        IssuanceInfo.show(issuanceID);
    },
    'click a.showFromAccountInfo'(event) {
        event.preventDefault();
        const from = lob.transactions.getTransaction(this.transactionHash).from;
        AccountInfo.show(from);
    },
    'click a.showToAccountInfo'(event) {
        event.preventDefault();
        const from = lob.transactions.getTransaction(this.transactionHash).to;
        AccountInfo.show(from);
    },
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});