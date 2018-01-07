import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
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
        const issuanceID = transaction.issuanceID;
        const issuanceLocation = IssuanceLocation.fromComponents(licenseContract, issuanceID);
        return lob.issuances.getIssuance(issuanceLocation).description;
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
    'click a.showIssuanceInfo'() {
        const transaction = lob.transactions.getTransaction(this.transactionHash);
        const issuanceLocation = IssuanceLocation.fromComponents(transaction.licenseContract, transaction.issuanceID);
        IssuanceInfo.show(issuanceLocation);
    },
    'click a.showFromAccountInfo'() {
        const from = lob.transactions.getTransaction(this.transactionHash).from;
        AccountInfo.show(from);
    },
    'click a.showToAccountInfo'() {
        const from = lob.transactions.getTransaction(this.transactionHash).from;
        AccountInfo.show(from);
    },
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});