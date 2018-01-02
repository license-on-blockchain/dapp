import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";

export const LicenseIssuingTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'licenseIssuingTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.licenseIssuingTransactionInfo.helpers({
    licenseContract() {
        return lob.transactions.getTransaction(this.transactionHash).licenseContract;
    },
    issuer() {
        return lob.transactions.getTransaction(this.transactionHash).from;
    },
    description() {
        return lob.transactions.getTransaction(this.transactionHash).description;
    },
    code() {
        return lob.transactions.getTransaction(this.transactionHash).code;
    },
    amount() {
        return lob.transactions.getTransaction(this.transactionHash).amount;
    },
    initialOwnerAddress() {
        return lob.transactions.getTransaction(this.transactionHash).initialOwnerAddress;
    },
    initialOwnerName() {
        return lob.transactions.getTransaction(this.transactionHash).initialOwnerName;
    },
    auditRemark() {
        return lob.transactions.getTransaction(this.transactionHash).auditRemark;
    },
    auditTime() {
        return formatDate(new Date(lob.transactions.getTransaction(this.transactionHash).auditTime * 1000));
    },
    transaction() {
        return lob.transactions.getTransaction(this.transactionHash);
    },
    etherscanUrl() {
        return Etherscan.getUrlForTransaction(this.transactionHash);
    }
});

Template.licenseIssuingTransactionInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});