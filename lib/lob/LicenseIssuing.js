import {getRootContract, getLicenseContract} from "./contractRetrieval";

const defaultGasEstimate = 1000000000000000000; // This is a just a very large number. If the gas estimate is equal to this number, the transaction will fail

class LicenseIssuingGasEstimator {
    /**
     * Create a new license contract under the given root contract
     * @param {string} rootContractAddress
     * @param {string} issuerAddress The address that shall be used to issue new licenses
     * @param {string} issuerName A human readable name of the person or organisation issuing the licenses
     * @param {string} liability A free text describing the liability the license issuer grants for his licenses
     * @param {number} safekeepingPeriod Number of years, purchasing records are kept by the issuer
     * @param {string} issuerCertificate A hex representation of a DER-encoded PKCS#12 certificate chain
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract.estimateGas(issuerName, liability, safekeepingPeriod, issuerCertificate, {from: issuerAddress, gas: defaultGasEstimate}, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(error, estimate);
        });
    }

    /**
     * @param {string} licenseContractAddress The license contract to sign
     * @param {string} signature The signature as a binary string
     * @param {string} from The issuer address of the license contract
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    signLicenseContract(licenseContractAddress, signature, from, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.sign.estimateGas(signature, {from, gas: defaultGasEstimate}, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(error, estimate);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} description A human-readable description of the license type
     * @param {string} code An internal code of the type
     * @param {number} amount Number of licenses to issue
     * @param {string} initialOwnerAddress Account that should first own the licenses
     * @param {string} initialOwnerName Name of the person or organisation owning the initial owner's account
     * @param {string} auditRemark An optional remark on what the result of the audit was
     * @param {number} auditTime The audit time as a unix timestamp (in seconds)
     * @param {string} from The issuer address of the license contract
     * @param {number} fee The issuing fee that is payed to the fee. Must be at least the fee required by the license
     *                     contract
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, fee, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense.estimateGas(description, code, initialOwnerName, amount, auditRemark, auditTime, initialOwnerAddress, {from, value: fee, gas: defaultGasEstimate}, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(error, estimate);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceID
     * @param {string} from The issuer address of the license contract
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    revokeIssuance(licenseContractAddress, issuanceID, from, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.revoke.estimateGas(issuanceID, {from, gas: defaultGasEstimate}, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(error, estimate);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} from The issuer address of the license contract
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    disableLicenseContract(licenseContractAddress, from, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.disable.estimateGas({from, gas: defaultGasEstimate}, (error, estimate) => {
            if (!error && estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(error, estimate);
        });
    }
}

export class LicenseIssuing {
    /**
     * @param {Transactions} transactions
     */
    constructor(transactions) {
        this.estimateGas = new LicenseIssuingGasEstimator();
        this._transactions = transactions;
    }

    /**
     * Create a new license contract under the given root contract
     * @param {string} rootContractAddress
     * @param {string} issuerAddress The address that shall be used to issue new licenses
     * @param {string} issuerName A human readable name of the person or organisation issuing the licenses
     * @param {string} liability A free text describing the liability the license issuer grants for his licenses
     * @param {number} safekeepingPeriod Number of years, purchasing records are kept by the issuer
     * @param {string} issuerCertificate A hex representation of a DER-encoded PKCS#12 certificate chain
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, gasPrice, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract(issuerName, liability, safekeepingPeriod, issuerCertificate, {from: issuerAddress, gasPrice}, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingLicenseContractCreation(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * @param {string} licenseContractAddress The license contract to sign
     * @param {string} signature The signature as a binary string
     * @param {string} from The issuer address of the license contract
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    signLicenseContract(licenseContractAddress, signature, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.sign(signature, {from, gasPrice}, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingLicenseContractSignature(licenseContractAddress, from, signature, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} description A human-readable description of the license type
     * @param {string} code An internal code of the type
     * @param {number} amount Number of licenses to issue
     * @param {string} initialOwnerAddress Account that should first own the licenses
     * @param {string} initialOwnerName Name of the person or organisation owning the initial owner's account
     * @param {string} auditRemark An optional remark on what the result of the audit was
     * @param {number} auditTime The audit time as a unix timestamp (in seconds)
     * @param {string} from The issuer address of the license contract
     * @param {number} fee The issuing fee that is payed to the fee. Must be at least the fee required by the license
     *                     contract
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, fee, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense(description, code, initialOwnerName, amount, auditRemark, auditTime, initialOwnerAddress, {from, gasPrice, value: fee}, callback);
    }

    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceID
     * @param {string} from The issuer address of the license contract
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    revokeIssuance(licenseContractAddress, issuanceID, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.revoke(issuanceID, {from, gasPrice}, callback);
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} from The issuer address of the license contract
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    disableLicenseContract(licenseContractAddress, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.disable({from, gasPrice}, callback);
    }
}