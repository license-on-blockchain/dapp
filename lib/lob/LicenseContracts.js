import {LazyReactiveVar} from "../LazyReactiveVar";
import {getLicenseContract} from "./contractRetrieval";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {hexToBytes} from "../utils";
import {PersistentMinimongo2} from 'meteor/frozeman:persistent-minimongo2'


class LicenseContract {
    /**
     * @param {string} licenseContractAddress
     * @param {Mongo.Collection} storage
     */
    constructor(licenseContractAddress, storage) {
        this.address = licenseContractAddress;

        this.storage = storage;

        this.issuerAddress = new LazyReactiveVar(null, (callback) => {
            this._getField('issuer', callback);
        });
        this.signature = new LazyReactiveVar(null, (callback) => {
            this._getField('signature', (value) => {
                callback(hexToBytes(value));
            });
        });
        this.issuerName = new LazyReactiveVar(null, (callback) => {
            this._getField('issuerName', callback);
        });
        this.sslCertificate = new LazyReactiveVar(null, (callback) => {
            this._getField('issuerCertificate', (value) => {
                callback(hexToBytes(value));
            });
        });
        this.certificateText = new LazyReactiveVar(null, (callback) => {
            this._getField('certificateText', callback);
        });
        // TODO: Watch this variable
        this.fee = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.fee((error, fee) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(fee);
            })
        });
        // TODO: Watch this variable
        this.issuancesCount = new LazyReactiveVar(null, (callback) => {
            const licenseContract = getLicenseContract(this.address);
            licenseContract.issuancesCount((error, fee) => {
                if (error) { handleUnknownEthereumError(error); return; }
                callback(fee);
            })
        });
    }

    /**
     * @param {string} fieldName
     * @param {function(*)} callback
     * @private
     */
    _getField(fieldName, callback) {
        const query = {
            address: this.address,
        };
        query[fieldName] = {$exists: true};

        const cachedValue = this.storage.findOne(query);
        if (cachedValue) {
            callback(cachedValue[fieldName]);
        } else {
            const licenseContract = getLicenseContract(this.address);
            licenseContract[fieldName]((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                const update = {};
                update[fieldName] = value;
                this.storage.update({address: this.address}, {$set: update});
                callback(value);
            });
        }
    }
}

export class LicenseContracts {
    constructor() {
        this._licenseContracts = {};

        this._storage = new Mongo.Collection('licenseContracts', {connection: null});
        if (Meteor.isClient) {
            new PersistentMinimongo2(this._storage, 'lob_wallet');
        }
    }

    /**
     * @param {string} licenseContractAddress
     * @returns {LicenseContract}
     */
    getLicenseContract(licenseContractAddress) {
        if (this._licenseContracts[licenseContractAddress] === undefined) {
            if (!web3.isAddress(licenseContractAddress)) {
                throw "Not a valid address";
            }
            this._licenseContracts[licenseContractAddress] = new LicenseContract(licenseContractAddress, this._storage);
        }
        return this._licenseContracts[licenseContractAddress];
    }

    /**
     * @param {string} licenseContractAddress
     * @returns {LicenseContract}
     */
    registerLicenseContract(licenseContractAddress) {
        if (!this._storage.findOne({address: licenseContractAddress})) {
            this._storage.insert({address: licenseContractAddress});
        }

        // Fetch the issuer so that the license contract shows up under managed license contracts if it is managed
        // by one of the user's accounts
        // TODO: Only do this if issuer tools are enabled
        this.getLicenseContract(licenseContractAddress).issuerAddress.get();
    }

    /**
     * @param {string|string[]} addresses The address(es) for which all managed license contracts shall be returned
     * @return {LicenseContract[]} License contract objects managed by the given addresses
     */
    getManagedLicenseContracts(addresses) {
        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        return this._storage.find({issuer: {$in: addresses}}).map((doc) => {
            return this.getLicenseContract(doc.address)
        });
    }
}