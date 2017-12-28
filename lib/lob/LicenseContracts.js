import {ReactiveMap} from "../ReactiveMap";
import {LazyReactiveVar} from "../LazyReactiveVar";
import {getLicenseContract} from "./contractRetrieval";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {hexToBytes} from "../utils";

class LicenseContract {
    constructor(licenseContractAddress) {
        this.address = licenseContractAddress;
        this.issuerAddress = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.issuer((error, issuerAddress) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(issuerAddress);
            });
        });
        this.signature = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.signature((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                value = hexToBytes(value);
                callback(value);
            });
        });
        this.issuerName = new LazyReactiveVar(null, (callback) => {
            getLicenseContract(this.address).issuerName((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(value);
            })
        });
        this.sslCertificate = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.issuerCertificate((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                value = hexToBytes(value);
                callback(value);
            });
        });
        this.certificateText = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.certificateText((error, text) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(text);
            });
        });
        this.fee = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.fee((error, fee) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(fee);
            })
        });
        this.issuancesCount = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.issuancesCount((error, fee) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(fee);
            })
        });
    }

    setIssuerAddress(issuerAddress) {
        this.issuerAddress.set(issuerAddress);
    }

}

export class LicenseContracts {
    constructor() {
        this._licenseContracts = new ReactiveMap((key) => {
            return new LicenseContract(key);
        });

        this._ownedLicenseContracts = new ReactiveMap(() => {
            return new Set();
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @returns {LicenseContract}
     */
    getLicenseContract(licenseContractAddress) {
        return this._licenseContracts.getKey(licenseContractAddress);
    }

    /**
     * @param {string|string[]} addresses The address(es) for which all managed license contracts shall be returned
     * @return {LicenseContract[]} License contract objects managed by the given addresses
     */
    getManagedLicenseContracts(addresses) {
        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        const relevantLicenseContracts = new Set();

        for (const address of addresses) {
            for (const relevantLicenseContractAddress of this._ownedLicenseContracts.getKey(address)) {
                const relevantLicenseContract = this.getLicenseContract(relevantLicenseContractAddress);
                relevantLicenseContracts.add(relevantLicenseContract);
            }
        }

        return Array.from(relevantLicenseContracts);
    }

    registerOwnedLicenseContract(issuerAddress, licenseContractAddress) {
        this._ownedLicenseContracts.updateKey(issuerAddress, (set) => {
            set.add(licenseContractAddress);
            return set;
        });
        this.getLicenseContract(licenseContractAddress).setIssuerAddress(issuerAddress);
    }
}