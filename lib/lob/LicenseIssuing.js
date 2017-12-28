import {getRootContract, getLicenseContract} from "./contractRetrieval";

class LicenseIssuingGasEstimator {
    createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, issuerCertificate, callback) {
        const rootContract = getRootContract(rootContractAddress);
        rootContract.createLicenseContract.estimateGas(issuerName, liability, safekeepingPeriod, issuerCertificate, {from: issuerAddress}, callback);
    }

    signLicenseContract(licenseContractAddress, signature, from, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.sign.estimateGas(signature, {from}, callback);
    }

    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, fee, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense.estimateGas(description, code, initialOwnerName, amount, auditRemark, auditTime, initialOwnerAddress, {from, value: fee}, callback);
    }

    revokeIssuance(licenseContractAddress, issuanceID, from, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.revoke.estimateGas(issuanceID, {from}, callback);
    }
}

export class LicenseIssuing {
    constructor() {
        this.estimateGas = new LicenseIssuingGasEstimator();
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
        rootContract.createLicenseContract(issuerName, liability, safekeepingPeriod, issuerCertificate, {from: issuerAddress, gasPrice}, callback);
    }

    signLicenseContract(licenseContractAddress, signature, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.sign(signature, {from, gasPrice}, callback)
    }

    issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTime, from, fee, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.issueLicense(description, code, initialOwnerName, amount, auditRemark, auditTime, initialOwnerAddress, {from, gasPrice, value: fee}, callback);
    }

    revokeIssuance(licenseContractAddress, issuanceID, from, gasPrice, callback) {
        const licenseContract = getLicenseContract(licenseContractAddress);
        licenseContract.revoke(issuanceID, {from, gasPrice}, callback);
    }
}