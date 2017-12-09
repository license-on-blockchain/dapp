import { EthAccounts } from 'meteor/ethereum:accounts';
import { CertificateChain } from "../../lib/CertificateChain";
import { lob } from "../../lib/LOB";
import { rootContractAddresses } from "../../lib/RootContracts";

Template.createLicenseContract.onCreated(function() {
    EthAccounts.init();

    this.getValues = function() {
        const rootContractAddress = this.find('[name=rootContract]').value;
        const issuerAddress = TemplateVar.getFrom(this.find('[name=issuerAddress]'), 'value');
        const issuerName = this.find('[name=issuerName]').value;
        const liability = this.find('[name=liability]').value;
        const safekeepingPeriod = this.find('[name=safekeepingPeriod]').value;
        const certificate = this.find('[name=sslCertificate]').value;

        return {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate};
    };

    this.resetErrors = function() {
        this.$('.dapp-error').removeClass('dapp-error');
    };

    this.onFormUpdate = function() {
        // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
        setTimeout(() => {
            this.validate();
        }, 0);
    };

    this.validate = function(errorOnEmpty = false) {
        const validateField = function(fieldName, validation, onlyWhenEmpty) {
            const enableValidation = errorOnEmpty || !onlyWhenEmpty;
            if (!validation && enableValidation) {
                this.$('[name=' + fieldName + ']').addClass('dapp-error');
                return true;
            } else {
                return false;
            }
        };

        // TODO: Show error messages

        this.resetErrors();

        const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate} = this.getValues();
        let hasError = false;

        if (!web3.isAddress(issuerAddress)) {
            // Error should already be displayed by dapp_selectAccount
            hasError = true;
        }

        hasError |= validateField('rootContract', rootContractAddress, true);
        hasError |= validateField('issuerName', issuerName, true);
        hasError |= validateField('liability', liability, true);
        hasError |= validateField('safekeepingPeriod', safekeepingPeriod, true);
        hasError |= validateField('sslCertificate', certificate, true);

        if (certificate) {
            // TODO: Allow certificate to be formatted as PEM
            let chain;
            try {
                chain = new CertificateChain(certificate);
            } catch (error) {
                console.log(error);
                chain = null;
            }

            hasError |= validateField('sslCertificate', chain, false);
        }

        return !hasError;
    }
});

Template.createLicenseContract.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    rootContracts: rootContractAddresses
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

        Template.instance().validate(true);

        const {rootContractAddress, issuerAddress, issuerName, liability, safekeepingPeriod, certificate} = Template.instance().getValues();

        lob.createLicenseContract(rootContractAddress, issuerName, liability, safekeepingPeriod, certificate, (error) => {
            if (error) {
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
