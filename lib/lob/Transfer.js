import {getLicenseContract} from "./contractRetrieval";

class TransferGasEstimator {
    transferLicense(issuanceLocation, from, to, amount, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        licenseContract.transfer.estimateGas(issuanceLocation.issuanceID, to, amount, { from }, callback);
    }

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
     * @param {Balances} balancesSubmodule
     */
    constructor(balancesSubmodule) {
        this.estimateGas = new TransferGasEstimator();
        this.balances = balancesSubmodule;
    }

    transferLicense(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        return licenseContract.transfer(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, (error, value) => {
            callback(error, value);
        });
    }

    transferLicenseAndAllowReclaim(issuanceLocation, from, to, amount, gasPrice, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        return licenseContract.transferAndAllowReclaim(issuanceLocation.issuanceID, to, amount, { from, gasPrice }, (error, value) => {
            callback(error, value);
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
        licenseContract.reclaim(issuanceLocation.issuanceID, from, amount, { from: reclaimer, gasPrice }, callback);
    }
}