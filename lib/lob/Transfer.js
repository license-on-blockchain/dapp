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
        licenseContract.methods.transfer(issuanceID.issuanceNumber, to, amount).estimateGas({ from, gas: defaultGasEstimate }).then((estimate) => {
            if (estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        }).catch(() => {
            callback(null, 0);
        })
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
        licenseContract.methods.transferTemporarily(issuanceID.issuanceNumber, to, amount).estimateGas({ from, gas: defaultGasEstimate }).then((estimate) => {
            if (estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        }).catch(() => {
            callback(null, 0);
        })
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
        licenseContract.methods.reclaim(issuanceID.issuanceNumber, from, amount).estimateGas({ from: reclaimer, gas: defaultGasEstimate }, (error, estimate) => {
            if (estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        }).catch(() => {
            callback(null, 0);
        })
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
        const x = licenseContract.methods.transfer(issuanceID.issuanceNumber, to, amount).send({ from, gasPrice });
        x.then(() => {
            console.log('1');
        });
        x.on('transactionHash', () => {
            console.log('th');
        });
        x.on('confirmation', () => {
            console.log('conf');
        });
        x.on('error', () => {
            console.log('error');
        });
        console.log(x);
        debugger;
        // x.then((transactionHash) => {
        //     debugger;
        //     this._transactions.addPendingTransfer(issuanceID, from, to, amount, /*reclaimable*/false, transactionHash);
        //     callback(null, transactionHash);
        // }).catch((error) => {
        //     debugger;
        //     callback(error, null);
        // });
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
        licenseContract.methods.transferTemporarily(issuanceID.issuanceNumber, to, amount).send({ from, gasPrice }).then((transactionHash) => {
            this._transactions.addPendingTransfer(issuanceID, from, to, amount, /*reclaimable*/true, transactionHash);
            callback(null, transactionHash);
        }).catch((error) => {
            callback(error, null);
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
        licenseContract.methods.reclaim(issuanceID.issuanceNumber, from, amount).send({ from: reclaimer, gasPrice }).then((transactionHash) => {
            this._transactions.addPendingReclaim(issuanceID, from, reclaimer, amount, transactionHash);
            callback(null, transactionHash);
        }).catch((error) => {
            callback(error, null);
        });
    }
}
