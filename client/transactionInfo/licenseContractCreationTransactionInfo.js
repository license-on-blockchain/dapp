import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";

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
    licenseContractName() {
        const address = lob.transactions.getTransaction(this.transactionHash).licenseContract;
        return lob.licenseContracts.getDisplayName(address);
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
});