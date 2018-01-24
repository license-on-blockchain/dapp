import {getLicenseContract, getRootContract} from "./contractRetrieval";
import {handleUnknownEthereumError} from "../ErrorHandling";
import {formatDate, hexToBytes} from "../utils";
import {PersistentMinimongo2} from 'meteor/frozeman:persistent-minimongo2'
import {PersistentCollections} from "../PersistentCollections";
import {EthNotificationCenter} from "./EthNotificationCenter";
import {CertificateChain} from "../CertificateChain";


export class LicenseContracts {
    constructor() {
        this._network = new ReactiveVar(null);
        if (Meteor.isClient && typeof web3 !== 'undefined') {
            web3.version.getNetwork((error, network) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this._network.set(network);
            });
        }

        // Store these two values separately from the collection so they don't get persisted
        this._issuanceFees = {};
        this._issuanceCounts = {};

        this._licenseContracts = PersistentCollections.licenseContracts;

        const self = this;

        this._licenseContracts.find({
            $or: [
                {signature: {$exists: false}},
                {signature: null}
            ],
            lobRoot: {$exists: true}
        }).observe({
            added(licenseContract) {
                const signingEventHandle = EthNotificationCenter.onLicenseContractSigning(licenseContract.address, (event) => {
                    // Trigger a refresh of the license contract's signature
                    self.getSignature(licenseContract.address);
                    signingEventHandle.stopWatching();
                });
                const disablingEventHandle = EthNotificationCenter.onLicenseContractDisabling(licenseContract.address, (event) => {
                    self._licenseContracts.update({_id: licenseContract.address, address: licenseContract.address}, {$set: {disabled: true}});
                    disablingEventHandle.stopWatching();
                });
            }
        });
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} fieldName
     * @param {function} transform
     * @return {*}
     * @private
     */
    _getField(licenseContractAddress, fieldName, transform = (x) => x) {
        if (!web3.isAddress(licenseContractAddress)) {
            debugger;
            throw "Not an address";
        }
        const query = {_id: licenseContractAddress};
        query[fieldName] = {$exists: true};
        query[fieldName] = {$ne: null};
        const cachedValue = this._licenseContracts.findOne(query);
        if (cachedValue) {
            return cachedValue[fieldName];
        } else {
            const licenseContract = getLicenseContract(licenseContractAddress);
            licenseContract[fieldName]((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                value = transform(value);
                const update = {};
                update[fieldName] = value;
                this._licenseContracts.update({_id: licenseContractAddress}, {$set: update});
            });
            return null;
        }
    }

    /**
     * @param {string} licenseContractAddress
     * @return {string}
     */
    getRootContract(licenseContractAddress) {
        return this._getField(licenseContractAddress, 'lobRoot', (address) => address.toLowerCase());
    }

    /**
     * @param {string} licenseContractAddress
     * @return {string}
     */
    getIssuerAddress(licenseContractAddress) {
        return this._getField(licenseContractAddress, 'issuer', (address) => address.toLowerCase());
    }

    /**
     * @param {string} licenseContractAddress
     * @return {string}
     */
    getIssuerName(licenseContractAddress) {
        return this._getField(licenseContractAddress, 'issuerName');
    }

    /**
     * Checks if the license contract with the given address has been signed. It does not check if the signature is
     * valid.
     *
     * @param {string} licenseContractAddress
     * @return {boolean}
     */
    isSigned(licenseContractAddress) {
        return this.getSignature(licenseContractAddress) !== null;
    }

    /**
     * @param {string} licenseContractAddress
     * @return {string|null} The signature of the given license contract as a binary string or `null` if the license
     *                       contract has not been signed or the signature is not loaded yet
     */
    getSignature(licenseContractAddress) {
        const signature = this._getField(licenseContractAddress, 'signature', (signature) => {
            if (signature === '0x') {
                return null;
            } else {
                return signature;
            }
        });
        if (signature !== null) {
            return hexToBytes(signature);
        } else {
            return null;
        }
    }

    getSignDate(licenseContractAddress) {
        const query = {
            _id: licenseContractAddress,
            signDate: {$exists: true}
        };
        const cachedValue = this._licenseContracts.findOne(query);
        if (cachedValue) {
            return new Date(cachedValue.signDate * 1000);
        } else {
            const licenseContract = getLicenseContract(licenseContractAddress);
            licenseContract.Signing({}, {fromBlock: 0}).get((error, events) => {
                if (error) { handleUnknownEthereumError(error); return; }
                if (events.length > 0) {
                    const blockNumber = events[0].blockNumber;
                    web3.eth.getBlock(blockNumber, (error, block) => {
                        if (error) { handleUnknownEthereumError(error); return; }
                        this._licenseContracts.update({_id: licenseContractAddress}, {$set: {
                            signDate: block.timestamp
                        }});
                    });
                }
            });
            return null;
        }
    }

    /**
     * @param {string} licenseContractAddress
     * @return {string|null} The SSL certificate of the given license contract as a binary string or `null` if the SSL
     *                       certificate has not been loaded yet
     */
    getSSLCertificate(licenseContractAddress) {
        const hexCertificate = this._getField(licenseContractAddress, 'issuerSSLCertificate');
        if (hexCertificate !== null) {
            return hexToBytes(hexCertificate);
        } else {
            return null;
        }
    }

    /**
     * Checks if the SSL certificate of the given license contract was valid to sign the certificate text. It does not
     * verify if the signature is valid. This is a reactive computation. It will initially return `null` until all
     * necessary data is loaded. Upon failure an error message is thrown.
     *
     * @param {string} licenseContractAddress
     * @returns {boolean|null}
     */
    isSSLCertificateValid(licenseContractAddress) {
        const sslCertificate = this.getSSLCertificate(licenseContractAddress);
        if (!sslCertificate) {
            return null;
        }
        const certificateChain = new CertificateChain(sslCertificate);
        if (!certificateChain) {
            throw TAPi18n.__('signatureValidationError.certificate_chain_could_not_be_parsed');
        }
        if (!certificateChain.verifyCertificateChain()) {
            throw TAPi18n.__('signatureValidationError.certificate_chain_not_valid');
        }
        return true;
    }

    /**
     * Checks if the SSL certificate of the given license contract was valid to sign the certificate text and verifies
     * that the signature is correct for the license contract's certificate text. This is a reactive computation. It
     * will initially return `null` until all necessary data is loaded. Upon failure an error message is thrown.
     * thrown.
     *
     * @param {string} licenseContractAddress
     * @returns {boolean|null}
     */
    isSignatureValid(licenseContractAddress) {
        const sslCertificateValid = this.isSSLCertificateValid(licenseContractAddress);
        if (sslCertificateValid !== true) {
            return sslCertificateValid;
        }
        const sslCertificate = this.getSSLCertificate(licenseContractAddress);
        if (!sslCertificate) {
            return null;
        }
        const certificateChain = new CertificateChain(sslCertificate);
        if (!certificateChain) {
            throw TAPi18n.__('signatureValidationError.certificate_chain_could_not_be_parsed');
        }
        const leafCertificate = certificateChain.getLeafCertificate();
        const signDate = this.getSignDate(licenseContractAddress);
        if (signDate < leafCertificate.validity.notBefore ||
            signDate > leafCertificate.validity.notAfter) {
            throw TAPi18n.__('signatureValidationError.certificate_not_valid_at_sign_date', {
                notBefore: leafCertificate.validity.notBefore.toUTCString(),
                notAfter: leafCertificate.validity.notAfter.toUTCString(),
                licenseContractSignDate: signDate.toUTCString()
            });
        }
        const certificateText = this.getCertificateText(licenseContractAddress);
        if (!certificateText) {
            return null;
        }
        const signature = this.getSignature(licenseContractAddress);
        if (!signature) {
            throw TAPi18n.__('signatureValidationError.license_contract_not_signed');
        }
        return certificateChain.verifySignature(certificateText, signature)
    }

    /**
     * Validates the SSL certificate and signature as described in `isSignatureValid`. If validation fails, returns the
     * thrown error message, otherwise returns `null`.
     *
     * @return {string|null}
     */
    getSignatureValidationError(licenseContractAddress) {
        try {
            if (this.isSignatureValid(licenseContractAddress)) {
                return null;
            } else {
                // noinspection ExceptionCaughtLocallyJS
                throw TAPi18n.__('signatureValidationError.generic');
            }
        } catch (error) {
            return error;
        }
    }

    /**
     * @param {string} licenseContractAddress
     * @return {string}
     */
    getCertificateText(licenseContractAddress) {
        return this._getField(licenseContractAddress, 'certificateText');
    }

    /**
     * @param {string} licenseContractAddress
     * @returns {number}
     */
    getIssuanceFee(licenseContractAddress) {
        if (this._issuanceFees[licenseContractAddress] === undefined) {
            this._issuanceFees[licenseContractAddress] = new ReactiveVar(null);
            const licenseContract = getLicenseContract(licenseContractAddress);
            licenseContract.issuanceFee((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                // TODO: Watch for changes of the issuance fee
                this._issuanceFees[licenseContractAddress].set(value);
            });
        }
        return this._issuanceFees[licenseContractAddress].get();
    }

    isDisabled(licenseContractAddress) {
        const disabled = this._getField(licenseContractAddress, 'disabled', (value) => {
            if (!value) {
                return null;
            } else {
                return value;
            }
        });
        return !!disabled;
    }

    /**
     * @param {string} licenseContractAddress
     * @returns {number}
     */
    getIssuancesCount(licenseContractAddress) {
        if (this._issuanceCounts[licenseContractAddress] === undefined) {
            this._issuanceCounts[licenseContractAddress] = new ReactiveVar(null);
            const licenseContract = getLicenseContract(licenseContractAddress);
            licenseContract.issuancesCount((error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this._issuanceCounts[licenseContractAddress].set(value);
            });
            EthNotificationCenter.onNewIssuing(licenseContractAddress, () => {
                licenseContract.issuancesCount((error, value) => {
                    if (error) { handleUnknownEthereumError(error); return; }
                    this._issuanceCounts[licenseContractAddress].set(value);
                });
            });
        }
        return this._issuanceCounts[licenseContractAddress].get();
    }

    /**
     * @param {string} licenseContractAddress
     * @returns {string|null}
     */
    getInternalName(licenseContractAddress) {
        const licenseContract = this._licenseContracts.findOne({_id: licenseContractAddress});
        if (licenseContract) {
            return licenseContract.internalName || null;
        } else {
            return null;
        }
    }

    /**
     * Returns the internal name of the contract if it exist or its address otherwise
     * @param {string} licenseContractAddress
     */
    getDisplayName(licenseContractAddress) {
        return this.getInternalName(licenseContractAddress) || licenseContractAddress;
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} internalName
     */
    setInternalName(licenseContractAddress, internalName) {
        if (!internalName) {
            internalName = null;
        }
        this._licenseContracts.upsert({_id: licenseContractAddress, address: licenseContractAddress}, {$set: {
            internalName: internalName
        }})
    }

    /**
     * @param {string} licenseContractAddress
     * @param {string} rootContractAddress
     * @param {number|null} rootContractIndex The index this license contract has in the root contract's
     *                                        licenseContract's array. Pass `null` if the index is not known
     */
    registerLicenseContract(licenseContractAddress, rootContractAddress, rootContractIndex) {
        web3.version.getNetwork((error, network) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this._licenseContracts.upsert({_id: licenseContractAddress}, {$set: {
                address: licenseContractAddress,
                lobRoot: rootContractAddress,
                rootContractIndex: rootContractIndex,
                network: network
            }});
        });

        // Fetch the issuer so that the license contract shows up under managed license contracts if it is managed
        // by one of the user's accounts
        // TODO: Only do this if issuer tools are enabled
        this.getIssuerAddress(licenseContractAddress);
    }

    /**
     * @param {string|string[]} addresses The address(es) for which all managed license contracts shall be returned
     * @return {string[]} License contract objects managed by the given addresses
     */
    getManagedLicenseContracts(addresses) {
        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        const query = {
            issuer: {$in: addresses},
            network: this._network.get()
        };

        return this._licenseContracts.find(query).map((doc) => doc.address);
    }


    /**
     * Returns the address of the license contract at index `rootContractIndex` of `rootContractAddress` if it is known
     * and `null` otherwise.
     *
     * @param {string} rootContractAddress
     * @param {number} rootContractIndex The index this license contract has in the root contract's licenseContract's
     *                                   array
     * @returns {Promise} A promise that will take the value of the license contract's address
     */
    getLicenseContractOfRootContract(rootContractAddress, rootContractIndex) {
        const cachedAddress = this._licenseContracts.findOne({
            lobRoot: rootContractAddress,
            rootContractIndex: rootContractIndex
        });
        if (cachedAddress) {
            return new Promise((resolve) => {
                resolve(cachedAddress.address);
            });
        } else {
            return new Promise((resolve, reject) => {
                const rootContract = getRootContract(rootContractAddress);
                rootContract.licenseContracts(rootContractIndex, (error, licenseContractAddress) => {
                    if (error) {
                        reject(error);
                    } else {
                        this.registerLicenseContract(licenseContractAddress, rootContractAddress, rootContractIndex);
                        resolve(licenseContractAddress.toLowerCase());
                    }
                });
            });
        }
    }
}