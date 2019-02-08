import {privateKeyCache} from "../../lib/PrivateKeyCache";
import {lob} from "../../lib/LOB";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {Etherscan} from "../../lib/Etherscan";

Template.waitForContractCreationMining.onCreated(function() {
    this.computations = new Set();

    this.web3Transaction = new ReactiveVar({});
});

Template.waitForContractCreationMining.onRendered(function() {
    const waitForCreationComputation = Tracker.autorun(() => {
        const transaction = lob.transactions.getTransaction(this.data.transactionHash);
        if (transaction && transaction.licenseContract) {
            privateKeyCache.associateTransactionPrivateKeyWithContractAddress(this.data.transactionHash, transaction.licenseContract);
            Router.go('licensecontracts.sign.withAddress', {licenseContractAddress: transaction.licenseContract});
        }
    });
    this.computations.add(waitForCreationComputation);

    web3.eth.getTransaction(this.data.transactionHash).then((transaction) => {
        this.web3Transaction.set(transaction);
    }).catch(handleUnknownEthereumError);
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
        return web3.utils.fromWei(Template.instance().web3Transaction.get().gasPrice, 'gwei');
    },
    maximumFee() {
        const web3Transaction = Template.instance().web3Transaction.get();
        if (web3Transaction.gasPrice) {
            return web3.utils.fromWei(web3Transaction.gasPrice.mul(web3Transaction.gas));
        } else {
            return 0;
        }
    },
    transactionHash() {
        return this.transactionHash;
    },
    etherscanUrl() {
        return Etherscan.getUrlForTransaction(this.transactionHash);
    }
});
