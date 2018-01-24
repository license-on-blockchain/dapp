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
     * @param {string} issuerSSLCertificate A hex representation of a DER-encoded PKCS#12 certificate chain
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerSSLCertificate, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract.estimateGas(issuerName, liability, safekeepingPeriod, issuerSSLCertificate, {from: issuerAddress, gas: defaultGasEstimate}, (error, estimate) => {
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
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
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} description A human-readable description of the license type
     * @param {string} code An internal code of the type
     * @param {number} amount Number of licenses to issue
     * @param {string} initialOwnerAddress Account that should first own the licenses
     * @param {string} auditRemark An optional remark on what the result of the audit was
     * @param {number} auditTime The audit time as a unix timestamp (in seconds)
     * @param {string} from The issuer address of the license contract
     * @param {number} issuanceFee The issuing fee that is payed to the fee. Must be at least the fee required by the
     *                             license contract
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, auditRemark, auditTime, from, issuanceFee, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense.estimateGas(description, code, initialOwnerAddress, amount, auditRemark, auditTime, {from, value: issuanceFee, gas: defaultGasEstimate}, (error, estimate) => {
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceNumber
     * @param {string} from The issuer address of the license contract
     * @param {string} revocationReason A free text explaining why the issuance gets revoked
     * @param {function(*, number)} callback A gas estimate of 0 means that the transaction will most likely fail
     */
    revokeIssuance(licenseContractAddress, issuanceNumber, from, revocationReason, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.revoke.estimateGas(issuanceNumber, revocationReason, {from, gas: defaultGasEstimate}, (error, estimate) => {
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
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
            if (error || estimate === defaultGasEstimate) {
                estimate = 0;
            }
            callback(null, estimate);
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
     * @param {string} issuerSSLCertificate A hex representation of a DER-encoded PKCS#12 certificate chain
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerSSLCertificate, gasPrice, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract(issuerName, liability, safekeepingPeriod, issuerSSLCertificate, {from: issuerAddress, gasPrice}, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingLicenseContractCreation(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerSSLCertificate, transactionHash);
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
     * @param {string} auditRemark An optional remark on what the result of the audit was
     * @param {number} auditTime The audit time as a unix timestamp (in seconds)
     * @param {string} from The issuer address of the license contract
     * @param {number} issuanceFee The issuing fee that is payed to the fee. Must be at least the fee required by the \
     *                             license contract
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, auditRemark, auditTime, from, issuanceFee, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense(description, code, initialOwnerAddress, amount, auditRemark, auditTime, {from, gasPrice, value: issuanceFee}, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingLicenseIssuing(licenseContractAddress, description, code, amount, initialOwnerAddress, auditRemark, auditTime, from, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceNumber
     * @param {string} from The issuer address of the license contract
     * @param {string} revocationReason A free text explaining why the issuance gets revoked
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    revokeIssuance(licenseContractAddress, issuanceNumber, from, revocationReason, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.revoke(issuanceNumber, revocationReason, {from, gasPrice}, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingIssuanceRevoke(licenseContractAddress, issuanceNumber, from, transactionHash);
            }
            callback(error, transactionHash);
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} from The issuer address of the license contract
     * @param {number} gasPrice
     * @param {function(*, *)} callback
     */
    disableLicenseContract(licenseContractAddress, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.disable({from, gasPrice}, (error, transactionHash) => {
            if (!error) {
                this._transactions.addPendingLicenseContractDisabling(licenseContractAddress, from, transactionHash);
            }
            callback(error, transactionHash);
        });
    }
}