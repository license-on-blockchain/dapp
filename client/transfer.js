import { EthAccounts } from 'meteor/ethereum:accounts';
import { lob } from "../lib/LOB";
import {handleUnknownEthereumError} from "../lib/ErrorHandling";

const selectedSenderAccount = new ReactiveVar();
const estimatedGasConsumption = new ReactiveVar(0);

Template.transfer.onCreated(function() {
    EthAccounts.init();
    EthBlocks.init();

    this.getValues = function() {
        const sender = TemplateVar.getFrom(this.find('[name=sender]'), 'value');
        const [issuanceID, licenseContract] = this.find('[name=issuance]').value.split("|");
        let recipient;
        if (this.data && this.data.destroy) {
            recipient = "0x0000000000000000000000000000000000000000";
        } else {
            recipient = TemplateVar.getFrom(this.find('[name=recipient]'), 'value');
        }
        const amount = this.find('[name=amount]').value;
        const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
        return {sender, issuanceID, licenseContract, recipient, amount, gasPrice};
    };

    this.resetErrors = function() {
        this.$('.dapp-error').removeClass('dapp-error');
    };

    this.onFormUpdate = function() {
        const {sender, issuanceID, recipient, amount} = this.getValues();

        lob.estimateGasTransferLicense("0xfD8F3a53e8445c19155d1E4d044C0A77EE6AEbef", issuanceID, sender, recipient, amount, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            estimatedGasConsumption.set(value);
        });

        // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
        setTimeout(() => {
            this.validate();
        }, 0);
    };

    this.validate = function(errorOnEmpty = false) {
        // TODO: Show error messages

        this.resetErrors();

        const {sender, issuanceID, licenseContract, recipient, amount} = this.getValues();
        selectedSenderAccount.set(sender);
        let hasError = false;

        if (!web3.isAddress(sender)) {
            // Error should already be displayed by dapp_selectAccount
            hasError = true;
        }

        // TODO: Check if private key exists for account

        if (!recipient && errorOnEmpty) {
            this.$('[name=recipient]').addClass('dapp-error');
            hasError = true;
        }

        if (!web3.isAddress(recipient)) {
            hasError = true;
        }

        if (!issuanceID && errorOnEmpty) {
            this.$('[name=issuance]').addClass('dapp-error');
            hasError = true;
        }

        if (!amount && errorOnEmpty) {
            this.$('[name=amount]').addClass('dapp-error');
            hasError = true;
        }

        if (amount > lob.allWatchedIssuances.getKey([licenseContract, issuanceID]).properBalance(sender).toNumber()) {
            this.$('[name=amount]').addClass('dapp-error');
            hasError = true;
        }

        return !hasError;
    };

    // Trigger a form update after everything has been created to set `selectedSenderAccount`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.transfer.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    issuances() {
        let selectedLicenseContract = undefined;
        let selectedIssuanceID = undefined;
        if (Template.instance().data) {
            selectedLicenseContract = Template.instance().data.licenseContract;
            if (selectedLicenseContract) {
                selectedLicenseContract = selectedLicenseContract.toLowerCase();
            }
            selectedIssuanceID = Template.instance().data.issuanceID;
        }

        return Object.values(lob.allWatchedIssuances.get()).filter((obj) => {
            return obj.properBalance(selectedSenderAccount.get()).toNumber() > 0 && !obj.revoked.get();
        }).map((obj) => {
            obj.selected = (obj.licenseContract.toLowerCase() == selectedLicenseContract && obj.issuanceID == selectedIssuanceID);
            return obj;
        });
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice
    },
    gasEstimate() {
        return estimatedGasConsumption.get();
    }
});

Template.transfer.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click button#transfer'(event) {
        event.preventDefault();
        if (!Template.instance().validate(true)) {
            return;
        }

        const {sender, issuanceID, licenseContract, recipient, amount, gasPrice} = Template.instance().getValues();

        lob.transferLicense(licenseContract, issuanceID, sender, recipient, amount, gasPrice, () => {
            // TODO: i18n
            GlobalNotification.success({
                content: 'Transaction successfully submitted',
                duration: 4
            });
        });
    }
});

Template.issuanceOption.helpers({
    balance() {
        return this.properBalance(selectedSenderAccount.get());
    },
    preselected() {
        return this.selected ? 'selected' : '';
    }
});
