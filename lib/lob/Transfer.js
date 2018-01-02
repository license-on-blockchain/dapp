import {getLicenseContract} from "./contractRetrieval";

const defaultGasEstimate = 1000000000000000000; // This is a just a very large number. If the gas estimate is equal to this number, the transaction will fail

class TransferGasEstimator {
    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    transferLicense(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transfer.estimateGas(issuanceLocation.issuanceID, to, amount, { from, gas: defaultGasEstimate }, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(error, estimate);
        });
    }

    /**
     * E
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    transferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transferAndAllowReclaim.estimateGas(issuanceLocation.issuanceID, to, amount, { from, gas: defaultGasEstimate }, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = null;
            }
            callback(error, estimate);
        });
    }

    /**
     * Estimate the gas consumption for the `reclaim` smart contract method.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    reclaim(issuanceLocation, reclaimer, from, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaim.estimateGas(issuanceLocation.issuanceID, from, amount, { from: reclaimer, gas: defaultGasEstimate }, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = null;
            }
            callback(error, estimate);
        });
    }
}

export class Transfer {
    /**
     * @param {Transactions} transactions
     */
    constructor(transactions) {
        this.estimateGas = new TransferGasEstimator();
        this._transactions = transactions;
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    transferLicense(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transfer(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingTransfer(issuanceLocation, from, to, amount, /*reclaimable*/false, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    transferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transferAndAllowReclaim(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingTransfer(issuanceLocation, from, to, amount, /*reclaimable*/true, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * Perform the `reclaim` smart contract method.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    reclaim(issuanceLocation, reclaimer, from, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaim(issuanceLocation.issuanceID, from, amount, { from: reclaimer, gasPrice }, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingReclaim(issuanceLocation, from, reclaimer, amount, transactionHash);
            }
            callback(error, transactionHash);
        });
    }
}