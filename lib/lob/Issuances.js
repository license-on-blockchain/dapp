import {LicenseContracts} from "./LicenseContracts";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {getLicenseContract} from "./contractRetrieval";
import {EthNotificationCenter} from "./EthNotificationCenter";

class Issuance {
    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {LicenseContract} licenseContract
     */
    constructor(issuanceLocation, licenseContract) {
        this.issuanceLocation = issuanceLocation;
        this.licenseContract = licenseContract;

        this.description = new ReactiveVar("…");
        this.code = new ReactiveVar("…");
        this.originalOwner = new ReactiveVar("…");
        this.originalSupply = new ReactiveVar("…");
        this.auditTime = new ReactiveVar("…");
        this.auditRemark = new ReactiveVar("…");
        this.revoked = new ReactiveVar("…");

        EthNotificationCenter.onRevoke(this.issuanceLocation, () => {
            this.revoked.set(true);
        });
    }

    /**
     * @param {Array} rawIssuanceData Issuance data as provided by the `issuances` method on the license contract
     */
    mergeRawIssuanceData(rawIssuanceData) {
        this.description.set(rawIssuanceData[0]);
        this.code.set(rawIssuanceData[1]);
        this.originalOwner.set(rawIssuanceData[2]);
        this.originalSupply.set(rawIssuanceData[3]);
        this.auditTime.set(rawIssuanceData[4]);
        this.auditRemark.set(rawIssuanceData[5]);
        this.revoked.set(rawIssuanceData[6]);
    }
}

export class Issuances {
    /**
     * @param {LicenseContracts} licenseContractsSubmodule
     */
    constructor(licenseContractsSubmodule) {
        this._issuances = {};
        this.licenseContracts = licenseContractsSubmodule;
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @returns {Issuance}
     */
    getIssuance(issuanceLocation) {
        if (!this._issuances[issuanceLocation]) {
            const licenseContract = this.licenseContracts.getLicenseContract(issuanceLocation.licenseContractAddress);
            this._issuances[issuanceLocation] = new Issuance(issuanceLocation, licenseContract);
            this._fetchIssuanceMetadata(issuanceLocation, (rawIssuanceData) => {
                this._issuances[issuanceLocation].mergeRawIssuanceData(rawIssuanceData);
            });
        }
        return this._issuances[issuanceLocation];
    }

    /**
     * @param {IssuanceLocation} issuanceLocation
     * @param {function(Array)} callback
     * @private
     */
    _fetchIssuanceMetadata(issuanceLocation, callback) {
        const licenseContract = getLicenseContract(issuanceLocation.licenseContractAddress);
        const issuanceID = issuanceLocation.issuanceID;
        licenseContract.issuances(issuanceID, (error, rawIssuanceData) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(rawIssuanceData);
        });
    }
}