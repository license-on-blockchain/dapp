import {EthAccounts} from 'meteor/ethereum:accounts';
import {CertificateChain} from "../../lib/CertificateChain";
import {lob} from "../../lib/LOB";
import {hexToBytes} from "../../lib/utils";
import {RootContracts} from "../../lib/RootContracts";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {privateKeyCache} from "../../lib/PrivateKeyCache";

function getValues() {
    const rootContractAddress = this.find('[name=rootContract]').value.toLowerCase();
    const issuerAddress = TemplateVar.getFrom(this.find('[name=issuerAddress]'), 'value').toLowerCase();
    const issuerName = this.find('[name=issuerName]').value;
    const liability = this.find('[name=liability]').value;
    const safekeepingPeriod = this.find('[name=safekeepingPeriod]').value;
    let certificate = this.find('[name=sslCertificate]').value;
    if (certificate.startsWith("-----BEGIN CERTIFICATE-----")) {
        certificate = CertificateChain.convertPemCertificateToPKCS12Bytes(certificate);
    } else {
        certificate = hexToBytes(certificate);
    }
    const privateKey = this.find('[name=sslPrivateKey]').value;

    return {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, privateKey};
}

function onFormUpdate() {
    const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate} = Template.instance().getValues();

    lob.licenseIssuing.estimateGas.createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, (error, gasConsumption) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.estimatedGasConsumption.set(gasConsumption);
    });

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, privateKey} = this.getValues();
    let noErrors = true;

    noErrors &= validateField('rootContract', rootContractAddress, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_root_contract_selected'), errorMessages);
    noErrors &= validateField('issuerAddress', web3.isAddress(issuerAddress), true, TAPi18n.__('createLicenseContract.error.no_issuer_address_selected'), errorMessages);
    noErrors &= validateField('issuerName', issuerName, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_issuerName_entered'), errorMessages);
    noErrors &= validateField('safekeepingPeriod', safekeepingPeriod, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_safekeepingPeriod_entered'), errorMessages);
    noErrors &= validateField('sslCertificate', certificate, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_sslCertificate_entered'), errorMessages);
    noErrors &= validateField('sslCertificate', () => {
        const certificateChain = new CertificateChain(certificate);
        return certificateChain.verifyCertificateChain();
    }, certificate, TAPi18n.__('createLicenseContract.error.sslCertificate_not_valid'), errorMessages);
    noErrors &= validateField('sslPrivateKey', () => {
        const textToSign = 'Test';
        // Sign some arbitrary text and check that the signature can be verified
        const signature = CertificateChain.generateSignature(textToSign, privateKey);
        const certificateChain = new CertificateChain(certificate);
        return certificateChain.verifySignature(textToSign, signature);
    }, privateKey && certificate, TAPi18n.__('createLicenseContract.error.sslPrivateKey_does_not_match'), errorMessages);
    noErrors &= validateField('gasEstimate', this.estimatedGasConsumption.get() !== 0, noErrors, TAPi18n.__('generic.transactionWillFail'), errorMessages);

    return noErrors;
}

Template.createLicenseContract.onCreated(function() {
    this.computations = new Set();

    this.estimatedGasConsumption = new ReactiveVar(null);

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.createLicenseContract.onRendered(function() {
    const validateGasEstimate = Tracker.autorun(() => {
        // Trigger a form validation when the estimatedGasConsumption changes
        this.estimatedGasConsumption.get();
        this.validate();
    });
    this.computations.add(validateGasEstimate);
});

Template.createLicenseContract.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.createLicenseContract.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    rootContracts: RootContracts.getAddressesAndNames(),
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    }
});

Template.createLicenseContract.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click button#submit'(event) {
        event.preventDefault();

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, gasPrice, certificate, privateKey} = Template.instance().getValues();

        lob.licenseIssuing.createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, gasPrice, (error, transactionHash) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            privateKeyCache.addPrivateKeyForTransaction(transactionHash, privateKey);
            Router.go('licensecontracts.waitforcreationmining', {transactionHash});
            NotificationCenter.showTransactionSubmitted();
        });
    }
});
