import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {getLicenseContract, getRootContract} from "../../lib/lob/contractRetrieval";
import {privateKeyCache} from "../../lib/PrivateKeyCache";
import {EthNotificationCenter} from "../../lib/lob/EthNotificationCenter";

function waitForLicenseContractCreation(rootContract, transactionHash, minedCallback) {
    // First check if the transaction has already been mined
    web3.eth.getTransaction(transactionHash, (error, transaction) => {
        if (error) { handleUnknownEthereumError(error); return; }
        if (transaction.blockNumber) {
            // The transaction has already been mined. Fetch the event from the specified block
            getRootContract(rootContract).LicenseContractCreation({}, {fromBlock: transaction.blockNumber, toBlock: transaction.blockNumber}, (error, event) => {
                if (error) { handleUnknownEthereumError(error); return; }
                if (event.transactionHash === transactionHash) {
                    minedCallback(event.args.licenseContractAddress);
                }
            });
        } else {
            // TODO: Stop watching after contract has been created
            // Transaction not mined yet. Wait for a license contract creation event of the root contract
            EthNotificationCenter.onLicenseContractCreation(rootContract, (licenseContractAddress, eventTransactionHash) => {
                if (eventTransactionHash === transactionHash) {
                    minedCallback(licenseContractAddress);
                }
            });
        }
    });
}

Template.waitForContractCreationMining.onCreated(function() {
    waitForLicenseContractCreation(this.data.rootContract, this.data.transactionHash, (licenseContractAddress) => {
        privateKeyCache.associateTransactionPrivateKeyWithContractAddress(this.data.transactionHash, licenseContractAddress);
        Router.go('licensecontracts.sign.withAddress', {licenseContractAddress: licenseContractAddress});
    });
});