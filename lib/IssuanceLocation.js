let __constructorCallAllowed = false;
let __issuanceLocations = {};

export class IssuanceLocation {
    /**
     * @param {string} licenseContractAddress
     * @param {number} issuanceID
     * @private
     */
    constructor(licenseContractAddress, issuanceID) {
        if (!__constructorCallAllowed) {
            console.warn("Called \"new IssuanceLocation\". IssuanceLocations should be constructed using the static \"fromComponents\" or \"fromString\" methods.");
            debugger;
        }
        this.licenseContractAddress = licenseContractAddress;
        this.issuanceID = issuanceID;
    }

    static fromComponents(licenseContractAddress, issuanceID) {
        const stringKey = licenseContractAddress + "|" + issuanceID;
        if (!__issuanceLocations[stringKey]) {
            __constructorCallAllowed = true;
            __issuanceLocations[stringKey] = new IssuanceLocation(licenseContractAddress, issuanceID);
            __constructorCallAllowed = false;
        }
        return __issuanceLocations[stringKey];
    }

    /**
     * @param {string} string An issuance location encoded by `toString`
     * @returns {IssuanceLocation|undefined} The encoded issuance location or `undefined` on error
     */
    static fromString(string) {
        if (string.indexOf("|") === -1) {
            return undefined;
        }
        const [licenseContractAddress, issuanceID] = string.split("|");
        return IssuanceLocation.fromComponents(licenseContractAddress, Number(issuanceID));
    }

    /**
     * @returns {string} A unique string description of the location
     */
    toString() {
        return this.licenseContractAddress + "|" + this.issuanceID;
    }
}
