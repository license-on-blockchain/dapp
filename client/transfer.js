import { EthAccounts } from 'meteor/ethereum:accounts';
import { lob } from "../lib/LOB";
import { IssuanceLocation } from "../lib/IssuanceLocation";
import { handleUnknownEthereumError } from "../lib/ErrorHandling";

const selectedSenderAccount = new ReactiveVar();
const estimatedGasConsumption = new ReactiveVar(0);

Template.transfer.onCreated(function() {
    EthAccounts.init();
    EthBlocks.init();

    this.getValues = function() {
        const sender = TemplateVar.getFrom(this.find('[name=sender]'), 'value');
        const [issuanceID, licenseContract] = this.find('[name=issuance]').value.split("|");
        const issuanceLocation = new IssuanceLocation(licenseContract, issuanceID);
        let recipient;
        if (this.data && this.data.destroy) {
            recipient = "0x0000000000000000000000000000000000000000";
        } else {
            recipient = TemplateVar.getFrom(this.find('[name=recipient]'), 'value');
        }
        const amount = this.find('[name=amount]').value;
        const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
        return {sender, issuanceID, licenseContract, recipient, amount, gasPrice, issuanceLocation};
    };

    this.resetErrors = function() {
        this.$('.dapp-error').removeClass('dapp-error');
    };

    this.onFormUpdate = function() {
        const {sender, recipient, amount, issuanceLocation} = this.getValues();

        if (this.data && this.data.allowReclaim) {
            lob.estimateGasTransferLicenseAndAllowReclaim(issuanceLocation, sender, recipient, amount, (error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                estimatedGasConsumption.set(value);
            });
        } else {
            lob.estimateGasTransferLicense(issuanceLocation, sender, recipient, amount, (error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                estimatedGasConsumption.set(value);
            });
        }

        // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
        setTimeout(() => {
            this.validate();
        }, 0);
    };

    this.validate = function(errorOnEmpty = false) {
        // TODO: Show error messages

        this.resetErrors();

        const {sender, issuanceID, issuanceLocation, recipient, amount} = this.getValues();
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

        if (amount > lob.getBalances(issuanceLocation).getOwnedBalance(sender).toNumber()) {
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
            selectedIssuanceID = Number(Template.instance().data.issuanceID);
        }

        return lob.getRelevantIssuanceLocations(selectedSenderAccount.get())
            .map((issuanceLocation) => {
                return {
                    issuanceLocation,
                    metadata: lob.getIssuanceMetadata(issuanceLocation),
                    balance: lob.getBalances(issuanceLocation),
                    selected: (issuanceLocation.licenseContractAddress.toLowerCase() === selectedLicenseContract && issuanceLocation.issuanceID === selectedIssuanceID),
                }
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

        const {sender, issuanceLocation, recipient, amount, gasPrice} = Template.instance().getValues();

        if (Template.instance().data && Template.instance().data.allowReclaim) {
            lob.transferLicenseAndAllowReclaim(issuanceLocation, sender, recipient, amount, gasPrice, () => {
                // TODO: i18n
                GlobalNotification.success({
                    content: 'Transaction successfully submitted',
                    duration: 4
                });
            });
        } else {
            lob.transferLicense(issuanceLocation, sender, recipient, amount, gasPrice, () => {
                // TODO: i18n
                GlobalNotification.success({
                    content: 'Transaction successfully submitted',
                    duration: 4
                });
            });
        }
    }
});

Template.issuanceOption.helpers({
    issuanceID() {
        return this.issuanceLocation.issuanceID;
    },
    licenseContract() {
        return this.issuanceLocation.licenseContractAddress;
    },
    preselected() {
        return this.selected ? 'selected' : '';
    },
    description() {
        return this.metadata.description.get();
    },
    balance() {
        return this.balance.getOwnedBalance(selectedSenderAccount.get());
    },
});
