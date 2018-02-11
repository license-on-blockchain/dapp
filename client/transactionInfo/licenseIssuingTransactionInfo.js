import {lob} from "../../lib/LOB";
import {formatDate} from "../../lib/utils";
import {Etherscan} from "../../lib/Etherscan";
import {LicenseContractInfo} from "../shared/licenseContractInfo";
import {AccountInfo} from "../shared/accountInfo";

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
    'click .showLicenseContractInfo'(event) {
        event.preventDefault();
        LicenseContractInfo.show(lob.transactions.getTransaction(this.transactionHash).licenseContract);
    },
    'click .showIssuerAccountInfo'(event) {
        event.preventDefault();
        const issuerAddress = lob.transactions.getTransaction(this.transactionHash).from;
        AccountInfo.show(issuerAddress);
    },
    'click .showInitialOwnerAccountInfo'(event) {
        event.preventDefault();
        const initialOwnerAddress = lob.transactions.getTransaction(this.transactionHash).initialOwnerAddress;
        AccountInfo.show(initialOwnerAddress);
    }
});