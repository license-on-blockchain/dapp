import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceID} from "../../lib/IssuanceID";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";
import {LicenseContractInfo} from "../shared/licenseContractInfo";
import {AccountInfo} from "../shared/accountInfo";

export const LicenseContractCreationTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'licenseContractCreationTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.licenseContractCreationTransactionInfo.helpers({
    rootContract() {
        return lob.transactions.getTransaction(this.transactionHash).rootContract;
    },
    licenseContract() {
        return lob.transactions.getTransaction(this.transactionHash).licenseContract;
    },
    issuerAddress() {
        return lob.transactions.getTransaction(this.transactionHash).issuerAddress;
    },
    issuerName() {
        return lob.transactions.getTransaction(this.transactionHash).issuerName;
    },
    liability() {
        return lob.transactions.getTransaction(this.transactionHash).liability;
    },
    safekeepingPeriod() {
        return Number(lob.transactions.getTransaction(this.transactionHash).safekeepingPeriod);
    },
    transaction() {
        return lob.transactions.getTransaction(this.transactionHash);
    },
    etherscanUrl() {
        return Etherscan.getUrlForTransaction(this.transactionHash);
    }
});

Template.licenseContractCreationTransactionInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
    'click .showLicenseContractInfo'() {
        const licenseContract = lob.transactions.getTransaction(this.transactionHash).licenseContract;
        LicenseContractInfo.show(licenseContract);
    },
    'click .showIssuerAccountInfo'() {
        const issuerAddress = lob.transactions.getTransaction(this.transactionHash).issuerAddress;
        AccountInfo.show(issuerAddress);
    }
});