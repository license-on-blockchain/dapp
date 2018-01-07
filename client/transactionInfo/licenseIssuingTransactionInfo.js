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
    'click .showLicenseContractInfo'() {
        LicenseContractInfo.show(lob.transactions.getTransaction(this.transactionHash).licenseContract);
    },
    'click .showIssuerAccountInfo'() {
        const issuerAddress = lob.transactions.getTransaction(this.transactionHash).from;
        AccountInfo.show(issuerAddress);
    },
    'click .showInitialOwnerAccountInfo'() {
        const initialOwnerAddress = lob.transactions.getTransaction(this.transactionHash).initialOwnerAddress;
        AccountInfo.show(initialOwnerAddress);
    }
});