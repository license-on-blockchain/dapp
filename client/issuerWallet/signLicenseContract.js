import forge from 'node-forge';
import {lob} from "../../lib/LOB";
import {CertificateChain} from "../../lib/CertificateChain";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {privateKeyCache} from "../../lib/PrivateKeyCache";
import {Accounts} from "../../lib/Accounts";
import {base64EncodeUnicode} from "../../lib/utils";

/**
 * Depending on the chosen signing method, either compute the signature or use the passed manual signature. Should the
 * generation of the signature fail, an error message is thrown.
 *
 * @param {string} signingMethod The chosen signing method (either 'manual' or 'privateKey')
 * @param {string} manualSignature A manually entered signature to choose if signing method is 'manual'
 * @param {string} privateKey The private key to generate a signature with, if 'privateKey' is chosen as signing method
 * @param {string} certificateText The certificate text to generate the signature for
 * @return {string} The generated binary signature
 */
function computeSignature(signingMethod, manualSignature, privateKey, certificateText) {
    switch (signingMethod) {
        case 'manual':
            if (manualSignature.startsWith('0x')) {
                manualSignature = manualSignature.substr(2);
            }
            manualSignature = manualSignature.toLowerCase();
            const binSignature = forge.util.hexToBytes(manualSignature);
            const reencoedSignature = forge.util.bytesToHex(binSignature);
            if (reencoedSignature !== manualSignature) {
                // If reencoding the signature does not give the same result, the signature is not valid hex
                throw TAPi18n.__("signLicenseContract.error.signature_not_in_hex");
            }
            return forge.util.hexToBytes(manualSignature);
        case 'privateKey':
            // TODO: Localise errors and add further descriptions
            return CertificateChain.generateSignature(certificateText, privateKey);
        default:
            console.error("Unknown signing method: " + signingMethod);
            return undefined;
    }
}

/**
 * Verify that the given signature is a valid signature of the given certificate text with respect to the given
 * certificate chain. Should this not be the case, an error message is thrown.
 *
 * @param {string} signature A hex representation of the signature without the '0x' prefix
 * @param {string} certificateText The text the signature is supposed to have signed
 * @param {CertificateChain} certificateChain The certificate chain to verify the signature
 */
function verifySignature(signature, certificateText, certificateChain) {
    return certificateChain.verifySignature(certificateText, signature);
}

function getValues() {
    const licenseContractAddress = TemplateVar.getFrom(this.find('.licenseContract'), 'value').toLowerCase();
    let signMethod = null;
    if (this.find('[name=signMethod]:checked')) {
        signMethod = this.find('[name=signMethod]:checked').value;
    }
    let manualSignature = null;
    if (this.find('[name=manualSignature]')) {
        manualSignature = this.find('[name=manualSignature]').value;
    }
    let privateKey = null;
    if (this.find('[name=privateKey]')) {
        privateKey = this.find('[name=privateKey]').value;
    }

    let confirmCertificateText = false;
    if (this.find('[name=confirmCertificateText]')) {
        confirmCertificateText = this.find('[name=confirmCertificateText]').checked;
    }

    let gasPrice = 0;
    if (this.find('.dapp-select-gas-price')) {
        gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    }

    return {licenseContractAddress, signMethod, manualSignature, privateKey, confirmCertificateText, gasPrice};
}

function onFormUpdate() {
    const {licenseContractAddress, signMethod, manualSignature, privateKey, certificateText} = this.getValues();

    // Determine which text field (signature or private key) to show
    switch (signMethod) {
        case 'manual':
            this.manualSigning.set(true);
            break;
        case 'privateKey':
            this.manualSigning.set(false);
            break;
        case null:
            return;
        default:
            console.error("Unknown signing method: " + signMethod);
            return;
    }

    this.selectedLicenseContract.set(licenseContractAddress);

    if (licenseContractAddress) {
        try {
            const signature = computeSignature(signMethod, manualSignature, privateKey, certificateText);
            const issuerAddress = lob.licenseContracts.getIssuerAddress(licenseContractAddress);
            lob.licenseIssuing.estimateGas.signLicenseContract(licenseContractAddress, signature, issuerAddress, (error, gasConsumpution) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this.estimatedGasConsumption.set(gasConsumpution);
            });
        } catch (error) {
            this.estimatedGasConsumption.set(0);
        }
    }

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    let noErrors = true;

    let {manualSignature, privateKey, signMethod, confirmCertificateText} = this.getValues();

    let fieldToValidate;
    // Verify that manual signature or private key has been entered
    switch (signMethod) {
        case 'manual':
            fieldToValidate = 'manualSignature';
            noErrors &= validateField('manualSignature', manualSignature, errorOnEmpty, TAPi18n.__('signLicenseContract.error.signature_empty'), errorMessages);
            break;
        case 'privateKey':
            fieldToValidate = 'privateKey';
            noErrors &= validateField('privateKey', privateKey, errorOnEmpty, TAPi18n.__('signLicenseContract.error.privateKey_empty'), errorMessages);
            break;
        default:
            console.error("Unknown signing method: " + signMethod);
            return;
    }

    if (this.selectedLicenseContract.get()) {
        // If something has been entered, verify the signature
        if (manualSignature || privateKey) {
            // Only perform signature validation if private key / manual signature are present

            const sslCertificate = lob.licenseContracts.getSSLCertificate(this.selectedLicenseContract.get());
            const certificateText = lob.licenseContracts.getCertificateText(this.selectedLicenseContract.get());

            if (sslCertificate && certificateText) {
                noErrors &= validateField(fieldToValidate, () => {
                    const certificateChain = new CertificateChain(sslCertificate);
                    const signature = computeSignature(signMethod, manualSignature, privateKey, certificateText);
                    return verifySignature(signature, certificateText, certificateChain);
                }, true, TAPi18n.__('signLicenseContract.error.signature_not_valid'));
            } else {
                noErrors &= validateField('manualSignature', false, errorOnEmpty, TAPi18n.__('signLicenseContract.error.signature_verification_data_not_loaded_yet'), errorMessages);
                noErrors &= validateField('privateKey', false, errorOnEmpty, TAPi18n.__('signLicenseContract.error.privateKey_verification_data_not_loaded_yet'), errorMessages);
            }
        }
    }
    noErrors &= validateField('confirmCertificateText', confirmCertificateText, signMethod === 'privateKey' && errorOnEmpty, TAPi18n.__('signLicenseContract.error.confirmCertificateText_not_ticked'), errorMessages);
    noErrors &= validateField('gasEstimate', this.estimatedGasConsumption.get() !== 0, noErrors, TAPi18n.__('generic.transactionWillFail'), errorMessages);

    return noErrors;
}

Template.signLicenseContract.onCreated(function() {
    this.computations = new Set();

    this.manualSigning = new ReactiveVar(false);
    this.selectedLicenseContract = new ReactiveVar(undefined);
    this.estimatedGasConsumption = new ReactiveVar(null);
    this.licenseContracts = new ReactiveVar([]);

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.signLicenseContract.onRendered(function() {
    const licenseContractsComputation = Tracker.autorun(() => {
        let licenseContracts = lob.licenseContracts.getManagedLicenseContracts(Accounts.get());
        // Don't show license contracts that are already signed
        licenseContracts = licenseContracts.filter((licenseContract) => {
            return !lob.licenseContracts.isSigned(licenseContract) && !lob.licenseContracts.isDisabled(licenseContract);
        });
        this.licenseContracts.set(licenseContracts);
        setTimeout(() => this.onFormUpdate(), 100);
    });
    this.computations.add(licenseContractsComputation);

    const validateGasEstimate = Tracker.autorun(() => {
        // Trigger a form validation when the estimatedGasConsumption changes
        this.estimatedGasConsumption.get();
        this.validate();
    });
    this.computations.add(validateGasEstimate);

    this.find('[name=privateKey]').placeholder = "-----BEGIN PRIVATE KEY-----\n" +
        "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIR0QpHOgJadA3\n" +
        "...\n" +
        "-----END PRIVATE KEY-----";
});

Template.signLicenseContract.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.signLicenseContract.helpers({
    licenseContracts() {
        let preselectedLicenseContract = undefined;
        if (Template.instance().data) {
            preselectedLicenseContract = Template.instance().data.licenseContractAddress
        }
        if (preselectedLicenseContract) {
            preselectedLicenseContract = preselectedLicenseContract.toLowerCase();
        }
        return Template.instance().licenseContracts.get()
            .map((licenseContract) => {
                return {
                    address: licenseContract,
                    selected: licenseContract.toLowerCase() === preselectedLicenseContract
                }
            })
            .sort((lhs, rhs) => lhs.address.localeCompare(rhs.address));
    },
    alreadySigned() {
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();
        if (selectedLicenseContract) {
            return lob.licenseContracts.isSigned(selectedLicenseContract);
        } else {
            return false;
        }
    },
    certificateText() {
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();
        if (selectedLicenseContract) {
            const certificateText = lob.licenseContracts.getCertificateText(selectedLicenseContract);
            if (certificateText) {
                return certificateText.split('\n');
            } else {
                return [];
            }
        } else {
            return [];
        }
    },
    manualSignature() {
        return Template.instance().manualSigning.get();
    },
    cachedPrivateKey() {
        return privateKeyCache.getPrivateKeyForContractAddress(Template.instance().data.licenseContractAddress);
    },
    downloadLicenseTextLink() {
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();
        if (selectedLicenseContract) {
            const certificateText = lob.licenseContracts.getCertificateText(selectedLicenseContract);
            return "data:text/plain;base64," + base64EncodeUnicode(certificateText);
        } else {
            return '';
        }
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    },
});

Template.signLicenseContract.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click button#sign'(event) {
        event.preventDefault();

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        privateKeyCache.clearPrivateKeyForContractAddress(Template.instance().data.licenseContractAddress);

        let {licenseContractAddress, manualSignature, privateKey, signMethod, gasPrice} = Template.instance().getValues();
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();
        const certificateText = lob.licenseContracts.getCertificateText(selectedLicenseContract);

        const binSignature = computeSignature(signMethod, manualSignature, privateKey, certificateText);
        const from = lob.licenseContracts.getIssuerAddress(licenseContractAddress);

        lob.licenseIssuing.signLicenseContract(licenseContractAddress, binSignature, from, gasPrice, (error) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            NotificationCenter.showTransactionSubmitted();
            Router.go('licensecontracts');
        })
    }
});