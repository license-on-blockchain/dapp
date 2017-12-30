import {getLicenseContract} from "./contractRetrieval";

class TransferGasEstimator {
    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {function(*, *)} callback
     */
    transferLicense(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transfer.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} from
     * @param {string} to
     * @param {number} amount
     * @param {function(*, *)} callback
     */
    transferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transferAndAllowReclaim.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

    /**
     * Estimate the gas consumption for the `reclaim` smart contract method.
     *
     * @param {IssuanceLocation} issuanceLocation
     * @param {string} reclaimer
     * @param {string} from
     * @param {number} amount
     * @param {function(*, number)} callback
     */
    reclaim(issuanceLocation, reclaimer, from, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.reclaim.estimateGas(issuanceLocation.issuanceID, from, amount, { from: reclaimer }, callback);
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