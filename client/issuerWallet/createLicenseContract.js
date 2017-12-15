import { EthAccounts } from 'meteor/ethereum:accounts';
import { CertificateChain } from "../../lib/CertificateChain";
import { lob } from "../../lib/LOB";
import { hexToBytes } from "../../lib/utils";
import { rootContractAddresses } from "../../lib/RootContracts";
import { handleUnknownEthereumError } from "../../lib/ErrorHandling";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";

function getValues() {
    const rootContractAddress = this.find('[name=rootContract]').value;
    const issuerAddress = TemplateVar.getFrom(this.find('[name=issuerAddress]'), 'value');
    const issuerName = this.find('[name=issuerName]').value;
    const liability = this.find('[name=liability]').value;
    const safekeepingPeriod = this.find('[name=safekeepingPeriod]').value;
    const certificate = hexToBytes(this.find('[name=sslCertificate]').value);

    return {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate};
}

function onFormUpdate() {
    const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate} = Template.instance().getValues();

    lob.licenseIssuing.estimateGas.createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, (error, gasConsumption) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.estimatedGasConsumption.set(gasConsumption);
    });

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => {
        this.validate();
    }, 0);
}

function validate(errorOnEmpty = false) {
    this.resetErrors();

    const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate} = this.getValues();
    let noErrors = true;

    noErrors &= validateField('rootContract', rootContractAddress, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_root_contract_selected'));
    noErrors &= validateField('issuerAddress', web3.isAddress(issuerAddress), true, TAPi18n.__('createLicenseContract.error.no_issuer_address_selected'));
    noErrors &= validateField('issuerName', issuerName, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_issuerName_entered'));
    noErrors &= validateField('safekeepingPeriod', safekeepingPeriod, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_safekeepingPeriod_entered'));
    noErrors &= validateField('sslCertificate', certificate, errorOnEmpty, TAPi18n.__('createLicenseContract.error.no_sslCertificate_entered'));
    // TODO: Allow certificate to be formatted as PEM
    noErrors &= validateField('sslCertificate', () => { return new CertificateChain(certificate)}, certificate, TAPi18n.__('createLicenseContract.error.sslCertificate_not_valid'));

    return noErrors;
}

Template.createLicenseContract.onCreated(function() {
    EthAccounts.init();

    this.estimatedGasConsumption = new ReactiveVar(0);

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.createLicenseContract.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    rootContracts: rootContractAddresses,
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

        if (!Template.instance().validate(true)) {
            return;
        }

        const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, gasPrice, certificate} = Template.instance().getValues();

        lob.licenseIssuing.createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, gasPrice, (error) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            NotificationCenter.showTransactionSubmitted();
        })

    }
});
