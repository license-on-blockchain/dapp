import {privateKeyCache} from "../../lib/PrivateKeyCache";
import {lob} from "../../lib/LOB";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

Template.waitForContractCreationMining.onCreated(function() {
    this.computations = new Set();

    const waitForCreationComputation = Tracker.autorun(() => {
        const transaction = lob.transactions.getTransaction(this.data.transactionHash);
        if (transaction && transaction.licenseContract) {
            privateKeyCache.associateTransactionPrivateKeyWithContractAddress(this.data.transactionHash, transaction.licenseContract);
            Router.go('licensecontracts.sign.withAddress', {licenseContractAddress: transaction.licenseContract});
        }
    });
    this.computations.add(waitForCreationComputation);

    this.web3Transaction = new ReactiveVar({});
    web3.eth.getTransaction(this.data.transactionHash, (error, transaction) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.web3Transaction.set(transaction);
    });
});

Template.waitForContractCreationMining.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.waitForContractCreationMining.helpers({
    from() {
        return Template.instance().web3Transaction.get().from;
    },
    to() {
        return Template.instance().web3Transaction.get().to;
    },
    gasPrice() {
        return web3.fromWei(Template.instance().web3Transaction.get().gasPrice, 'gwei');
    },
    maximumFee() {
        const web3Transaction = Template.instance().web3Transaction.get();
        if (web3Transaction.gasPrice) {
            return web3.fromWei(web3Transaction.gasPrice.mul(web3Transaction.gas));
        } else {
            return 0;
        }
    },
    transactionHash() {
        return this.transactionHash;
    }
});