const network = new ReactiveVar(null);

Meteor.startup(function() {
    if (Meteor.isClient) {
        web3.version.getNetwork((error, value) => {
            network.set(value);
        });
    }
});

export const Etherscan = {
    getUrlForTransaction(transactionHash) {
        switch (network.get()) {
            case "1": // mainnet
                return "https://etherscan.io/tx/" + transactionHash;
            case "3": // ropsten
                return "https://ropsten.etherscan.io/tx/" + transactionHash;
            default:
                return null;
        }
    }
};