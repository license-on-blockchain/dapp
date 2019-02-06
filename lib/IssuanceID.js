let __constructorCallAllowed = false;
let __issuanceIDs = {};

export class IssuanceID {
    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceNumber
     * @private
     */
    constructor(licenseContractAddress, issuanceNumber) {
        if (!__constructorCallAllowed) {
            console.warn("Called \"new IssuanceID\". IssuanceIDs should be constructed using the static \"fromComponents\" or \"fromString\" methods.");
            debugger;
        }
        this.licenseContractAddress = String(licenseContractAddress);
        this.issuanceNumber = Number(issuanceNumber);
    }

    static fromComponents(licenseContractAddress, issuanceNumber) {
        licenseContractAddress = licenseContractAddress.toLowerCase();
        const stringKey = licenseContractAddress + "|" + issuanceNumber;
        if (!__issuanceIDs[stringKey]) {
            __constructorCallAllowed = true;
            __issuanceIDs[stringKey] = new IssuanceID(licenseContractAddress, issuanceNumber);
            __constructorCallAllowed = false;
        }
        return __issuanceIDs[stringKey];
    }

    /**
     * @param {string} string An issuance ID encoded by `toString`
     * @returns {IssuanceID|undefined} The encoded issuance ID or `undefined` on error
     */
    static fromString(string) {
        if (string.indexOf("|") === -1) {
            return undefined;
        }
        const [licenseContractAddress, issuanceNumber] = string.split("|");
        return IssuanceID.fromComponents(licenseContractAddress.toLowerCase(), Number(issuanceNumber));
    }

    /**
     * @returns {string} A unique string description of the issuance ID
     */
    toString() {
        return this.licenseContractAddress + "|" + this.issuanceNumber;
    }
}
