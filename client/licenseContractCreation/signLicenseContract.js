import forge from 'node-forge';
import { lob } from "../../lib/LOB";
import { CertificateChain } from "../../lib/CertificateChain";
import { handleUnknownEthereumError } from "../../lib/ErrorHandling";

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
                // TODO: i18n
                throw 'Signature is not in hex';
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
    if (!certificateChain.verifySignature(certificateText, signature)) {
        // TODO: i18n
        throw 'Signature is not valid';
    }
    return true;
}

Template.signLicenseContract.onCreated(function() {
    EthBlocks.init();

    this.manualSigning = new ReactiveVar(false);
    this.selectedLicenseContract = new ReactiveVar(undefined);
    this.estimatedGasConsumption = new ReactiveVar(0);
    this.licenseContracts = new ReactiveVar([]);

    this.getValues = function() {
        const licenseContractAddress = this.find('[name=licenseContract]').value;
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

        let gasPrice = 0;
        if (this.find('.dapp-select-gas-price')) {
            gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
        }

        return {licenseContractAddress, signMethod, manualSignature, privateKey, gasPrice};
    };

    this.resetErrors = function() {
        this.$('.dapp-error').removeClass('dapp-error');
        this.$('.lob-error-message').html("");
    };

    this.onFormUpdate = function() {
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

        // Update the selected license contract
        const licenseContracts = this.licenseContracts.get();
        // Fetch the LicenseContract object with this address
        const selectedLicenseContract = licenseContracts.filter((licenseContract) => licenseContract.address === licenseContractAddress)[0];
        this.selectedLicenseContract.set(selectedLicenseContract);

        try {
            const signature = computeSignature(signMethod, manualSignature, privateKey, certificateText);
            lob.estimateGasSignLicenseContract(licenseContractAddress, signature, selectedLicenseContract.issuerAddress, (error, gasConsumpution) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this.estimatedGasConsumption.set(gasConsumpution);
            });
        } catch (error) {
            this.estimatedGasConsumption.set(0);
        }

        // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
        setTimeout(() => {
            this.validate();
        }, 0);
    };

    this.validate = function(errorOnEmpty = false) {
        const validateField = function(fieldName, validation, isEmptyCheck, errorMessage) {
            const enableValidation = errorOnEmpty || !isEmptyCheck;
            if (!validation && enableValidation) {
                this.$('[name=' + fieldName + ']').addClass('dapp-error');
                this.$('.lob-error-message[data-for=' + fieldName + ']').html(errorMessage);
                return true;
            } else {
                return false;
            }
        };

        this.resetErrors();

        let hasErrors = false;

        let {manualSignature, privateKey, signMethod} = this.getValues();

        switch (signMethod) {
            case 'manual':
                // TODO: i18n
                hasErrors |= validateField('manualSignature', manualSignature, true, "Signature must not be empty");
                break;
            case 'privateKey':
                // TODO: i18n
                hasErrors |= validateField('privateKey', privateKey, true, "Private key must not be empty");
                break;
            default:
                console.error("Unknown signing method: " + signMethod);
                return;
        }


        if (manualSignature || privateKey) {
            // Only perform signature validation if private key / manual signature are present

            const sslCertificate = this.selectedLicenseContract.get().sslCertificate.get();
            const certificateText = this.selectedLicenseContract.get().certificateText.get();

            if (sslCertificate && certificateText) {
                try {
                    const certificateChain = new CertificateChain(sslCertificate);
                    const signature = computeSignature(signMethod, manualSignature, privateKey, certificateText);
                    verifySignature(signature, certificateText, certificateChain);
                } catch (error) {
                    // TODO: i18n: Localise error messages
                    validateField('manualSignature', false, false, error);
                    validateField('privateKey', false, false, error);
                    hasErrors = true;
                }
            } else {
                if (errorOnEmpty) {
                    // TODO: i18n: Localise error messages
                    validateField('manualSignature', false, false, "Data necessary to verify the signature not loaded from the blockchain yet. Please wait a moment and try again.");
                    validateField('privateKey', false, false, error, "Data necessary to generate the signature not loaded from the blockchain yet. Please wait a moment and try again.");
                    hasErrors = true;
                }
            }
        }

        return !hasErrors;
    };
});

Template.signLicenseContract.onRendered(function() {
    Tracker.autorun(() => {
        let licenseContracts = lob.getManagedLicenseContracts(lob.accounts.get());
        // Don't show license contracts that are already signed
        // licenseContracts = licenseContracts.filter((licenseContract) => !licenseContract.signature.get());
        this.licenseContracts.set(licenseContracts);
        setTimeout(() => {
            this.onFormUpdate();
        }, 0);
    });

    this.onFormUpdate();
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
                licenseContract,
                selected: licenseContract.address.toLowerCase() === preselectedLicenseContract
            }
        });
    },
    alreadySigned() {
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();

        if (selectedLicenseContract) {
            return selectedLicenseContract.signature.get();
        } else {
            return false;
        }
    },
    manualSignature() {
        return Template.instance().manualSigning.get();
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

        if (!Template.instance().validate(true)) {
            return;
        }

        let {licenseContractAddress, manualSignature, privateKey, signMethod, gasPrice} = Template.instance().getValues();
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();

        const binSignature = computeSignature(signMethod, manualSignature, privateKey, selectedLicenseContract.certificateText.get());
        const from = selectedLicenseContract.issuerAddress;

        lob.signLicenseContract(licenseContractAddress, binSignature, from, gasPrice, (error) => {
            if (error) {
                // TODO: i18n: Localise error message
                GlobalNotification.error({
                    content: error,
                    duration: 4
                });
                return;
            }
            // TODO: i18n
            GlobalNotification.success({
                content: 'Transaction successfully submitted',
                duration: 4
            });
        })
    }
});

Template.licenseContractOption.helpers({
    preselected() {
        return this.selected ? 'selected' : '';
    },
    address() {
        return this.licenseContract.address;
    }
});