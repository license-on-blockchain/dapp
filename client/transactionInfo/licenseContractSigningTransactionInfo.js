import {lob} from "../../lib/LOB";
import {Etherscan} from "../../lib/Etherscan";
import {LicenseContractInfo} from "../shared/licenseContractInfo";
import {AccountInfo} from "../shared/accountInfo";

export const LicenseContractSigningTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'licenseContractSigningTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.licenseContractSigningTransactionInfo.helpers({
    licenseContract() {
        return lob.transactions.getTransaction(this.transactionHash).licenseContract;
    },
    from() {
        return lob.transactions.getTransaction(this.transactionHash).from;
    },
    transaction() {
        return lob.transactions.getTransaction(this.transactionHash);
    },
    etherscanUrl() {
        return Etherscan.getUrlForTransaction(this.transactionHash);
    }
});

Template.licenseContractSigningTransactionInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
    'click .showLicenseContractInfo'(event) {
        event.preventDefault();
        LicenseContractInfo.show(lob.transactions.getTransaction(this.transactionHash).licenseContract);
    },
    'click .showFromAccountInfo'(event) {
        event.preventDefault();
        const fromAddress = lob.transactions.getTransaction(this.transactionHash).from;
        AccountInfo.show(fromAddress);
    }
});