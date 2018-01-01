import {lob} from "../../lib/LOB";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

export const LicenseContractCreationTransactionInfo = {
    show(transactionHash) {
        EthElements.Modal.show({
            template: 'licenseContractCreationTransactionInfo',
            data: {transactionHash},
            class: 'mediumModal'
        });
    }
};

Template.licenseContractCreationTransactionInfo.onCreated(function() {
    this.computations = new Set();

    const transactionHash = this.data.transactionHash;

    // Fake a reactive var that is just a reference
    this.data.transaction = {
        get() {
            return lob.transactions.getTransaction(transactionHash);
        }
    };

    this.data.web3Transaction = new ReactiveVar({});
    const web3TransactionComputation = Tracker.autorun(() => {
        web3.eth.getTransaction(this.data.transactionHash, (error, transaction) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.data.web3Transaction.set(transaction);
        });
    });
    this.computations.add(web3TransactionComputation);
});

Template.licenseContractCreationTransactionInfo.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.licenseContractCreationTransactionInfo.helpers({
    rootContract() {
        return this.transaction.get().rootContract;
    },
    licenseContract() {
        return this.transaction.get().licenseContract;
    },
    issuerAddress() {
        return this.transaction.get().issuerAddress;
    },
    issuerName() {
        return this.transaction.get().issuerName;
    },
    liability() {
        return this.transaction.get().liability;
    },
    safekeepingPeriod() {
        return this.transaction.get().safekeepingPeriod;
    },
    submissionDate() {
        return formatDate(new Date(this.transaction.get().timestamp));
    },
    blockNumber() {
        return this.transaction.get().blockNumber;
    },
    confirmations() {
        return EthBlocks.latest.number - this.transaction.get().blockNumber;
    },
    transactionFee() {
        const gasPrice = this.web3Transaction.get().gasPrice;
        if (gasPrice) {
            return web3.fromWei(gasPrice.mul(this.web3Transaction.get().gas)).toNumber();
        } else {
            return "…";
        }
    }
});

Template.licenseContractCreationTransactionInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});