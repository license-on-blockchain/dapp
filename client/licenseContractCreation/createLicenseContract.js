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

    lob.estimateGasCreateLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, (error, gasConsumption) => {
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

    // TODO: i18n
    noErrors &= validateField('rootContract', rootContractAddress, errorOnEmpty, "You need to specify under which root contract you want to create your license contract");
    noErrors &= validateField('issuerAddress', web3.isAddress(issuerAddress), true, "You need to choose which address to use for future license issuings");
    noErrors &= validateField('issuerName', issuerName, errorOnEmpty, "Please provide your or your organisation's name that matches the name on the SSL certificate");
    noErrors &= validateField('safekeepingPeriod', safekeepingPeriod, errorOnEmpty, "Please specify, how long you keep purchase records");
    noErrors &= validateField('sslCertificate', certificate, errorOnEmpty, "Please provide an SSL certificate");
    // TODO: Allow certificate to be formatted as PEM
    noErrors &= validateField('sslCertificate', () => { return new CertificateChain(certificate)}, certificate, "The certificate is not valid");

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

        lob.createLicenseContract(rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate, gasPrice, (error) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            // TODO: i18n
            NotificationCenter.showTransactionSubmitted();
        })

    }
});
