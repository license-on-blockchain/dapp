import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";

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
    'click .showLicenseContractInfo'() {
        LicenseContractInfo.show(lob.transactions.getTransaction(this.transactionHash).licenseContract);
    }
});