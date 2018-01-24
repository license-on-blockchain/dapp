import {getLicenseContract} from "./contractRetrieval";

const defaultGasEstimate = 1000000000000000000; // This is a just a very large number. If the gas estimate is equal to this number, the transaction will fail

class TransferGasEstimator {
    /**
     * @param {IssuanceID} issuanceID
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    transferLicense(issuanceID, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        licenseContract.transfer.estimateGas(issuanceID.issuanceNumber, to, amount, { from, gas: defaultGasEstimate }, (error, estimate) => {
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        });
    }

    /**
     * E
     *
     * @param {IssuanceID} issuanceID
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    transferLicenseAndAllowReclaim(issuanceID, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        licenseContract.transferTemporarily.estimateGas(issuanceID.issuanceNumber, to, amount, { from, gas: defaultGasEstimate }, (error, estimate) => {
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        });
    }

    /**
     * Estimate the gas consumption for the `reclaim` smart contract method.
     *
     * @param {IssuanceID} issuanceID
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    reclaim(issuanceID, reclaimer, from, amount, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        licenseContract.reclaim.estimateGas(issuanceID.issuanceNumber, from, amount, { from: reclaimer, gas: defaultGasEstimate }, (error, estimate) => {
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
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
     * @param {IssuanceID} issuanceID
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    transferLicense(issuanceID, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        licenseContract.transfer(issuanceID.issuanceNumber, to, amount, { from, gasPrice }, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingTransfer(issuanceID, from, to, amount, /*reclaimable*/false, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * @param {IssuanceID} issuanceID
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    transferLicenseAndAllowReclaim(issuanceID, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        licenseContract.transferTemporarily(issuanceID.issuanceNumber, to, amount, { from, gasPrice }, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingTransfer(issuanceID, from, to, amount, /*reclaimable*/true, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * Perform the `reclaim` smart contract method.
     *
     * @param {IssuanceID} issuanceID
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    reclaim(issuanceID, reclaimer, from, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceID.licenseContractAddress);
        licenseContract.reclaim(issuanceID.issuanceNumber, from, amount, { from: reclaimer, gasPrice }, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingReclaim(issuanceID, from, reclaimer, amount, transactionHash);
            }
            callback(error, transactionHash);
        });
    }
}