export class IssuanceLocation {
    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceID
     */
    constructor(licenseContractAddress, issuanceID) {
        this.licenseContractAddress = licenseContractAddress;
        this.issuanceID = issuanceID;
    }

    /**
     * @returns {string} A unique string description of the location
     */
    toString() {
        return this.licenseContractAddress + "|" + this.issuanceID;
    }
}
