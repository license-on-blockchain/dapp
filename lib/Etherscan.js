export const Etherscan = {
    getUrlForTransaction(transactionHash) {
        switch (web3.version.network) {
            case "1": // mainnet
                return "https://etherscan.io/tx/" + transactionHash;
            case "3": // ropsten
            default:
                return "https://ropsten.etherscan.io/tx/" + transactionHash;
        }
    }
};