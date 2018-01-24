import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceID} from "../../lib/IssuanceID";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";

export const IssuanceRevokeTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'issuanceRevokeTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.issuanceRevokeTransactionInfo.helpers({
    transactionHash() {
        return this.transactionHash;
    },
    issuanceDescription() {
        const transaction = lob.transactions.getTransaction(this.transactionHash);
        const licenseContract = transaction.licenseContract;
        const issuanceNumber = transaction.issuanceNumber;
        const issuanceID = IssuanceID.fromComponents(licenseContract, issuanceNumber);
        const issuance = lob.issuances.getIssuance(issuanceID);
        if (issuance) {
            return issuance.description;
        } else {
            return "";
        }
    },
    revokedBy() {
        return lob.transactions.getTransaction(this.transactionHash).from;
    },
    transaction() {
        return lob.transactions.getTransaction(this.transactionHash);
    },
    etherscanUrl() {
        return Etherscan.getUrlForTransaction(this.transactionHash);
    }
});

Template.issuanceRevokeTransactionInfo.events({
    'click a.showIssuanceInfo'() {
        const transaction = lob.transactions.getTransaction(this.transactionHash);
        const issuanceID = IssuanceID.fromComponents(transaction.licenseContract, transaction.issuanceNumber);
        IssuanceInfo.show(issuanceID);
    },
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});