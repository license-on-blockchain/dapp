import { EthAccounts } from 'meteor/ethereum:accounts';
import { lob } from "../../lib/LOB";
import { IssuanceLocation } from "../../lib/IssuanceLocation";
import { handleUnknownEthereumError } from "../../lib/ErrorHandling";
import { resetErrors, validateField } from "../../lib/FormHelpers";
import { NotificationCenter } from "../../lib/NotificationCenter";

const selectedSenderAccount = new ReactiveVar();

function getValues() {
    const sender = TemplateVar.getFrom(this.find('[name=sender]'), 'value').toLowerCase();
    const issuanceLocation = IssuanceLocation.fromString(this.find('[name=issuance]').value);
    let recipient;
    if (this.data && this.data.destroy) {
        recipient = "0x0000000000000000000000000000000000000000";
    } else {
        recipient = TemplateVar.getFrom(this.find('[name=recipient]'), 'value');
    }
    const amount = this.find('[name=amount]').value;
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    return {sender, recipient, amount, gasPrice, issuanceLocation};
}

function onFormUpdate() {
    const {sender, recipient, amount, issuanceLocation} = this.getValues();

    if (issuanceLocation) {
        if (this.data && this.data.allowReclaim) {
            lob.transfer.estimateGas.transferLicenseAndAllowReclaim(issuanceLocation, sender, recipient, amount, (error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this.estimatedGasConsumption.set(value);
            });
        } else {
            lob.transfer.estimateGas.transferLicense(issuanceLocation, sender, recipient, amount, (error, value) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this.estimatedGasConsumption.set(value);
            });
        }
    }


    selectedSenderAccount.set(sender);

    let destroyLink = '/destroy';
    if (issuanceLocation) {
        destroyLink += '/from/' + sender + '/licenseContract/' + issuanceLocation.licenseContractAddress + '/issuance/' + issuanceLocation.issuanceID;
        if (amount) {
            destroyLink += '/amount/' + amount;
        }
    }
    this.destroyLink.set(destroyLink);

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {sender, issuanceLocation, recipient, amount} = this.getValues();
    let noErrors = true;

    noErrors &= validateField('sender', web3.isAddress(sender), true, null, errorMessages);
    noErrors &= validateField('recipient', web3.isAddress(recipient), errorOnEmpty, TAPi18n.__('transfer.error.recipient_not_valid_address'), errorMessages);
    noErrors &= validateField('recipient', () => recipient.toLowerCase() !== sender.toLowerCase(), recipient && sender, TAPi18n.__('transfer.error.recipient_equal_to_sender'), errorMessages);
    noErrors &= validateField('issuance', issuanceLocation, errorOnEmpty, TAPi18n.__('transfer.error.no_issuance_selected'), errorMessages);
    noErrors &= validateField('amount', amount, errorOnEmpty, TAPi18n.__('transfer.error.no_amount_specified'), errorMessages);
    noErrors &= validateField('amount', amount > 0, amount, TAPi18n.__('transfer.error.amount_zero'), errorMessages);
    noErrors &= validateField('gasEstimate', this.estimatedGasConsumption.get() !== 0, noErrors, TAPi18n.__('generic.transactionWillFail'), errorMessages);

    return noErrors;
}

Template.transfer.onCreated(function() {
    this.computations = new Set();

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.estimatedGasConsumption = new ReactiveVar(null);
    this.destroyLink = new ReactiveVar('/destroy');
    this.issuanceLocations = new ReactiveVar([]);

    // Trigger a form update after everything has been created to set `selectedSenderAccount`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.transfer.onRendered(function() {
    const issuanceLocationsComputation = Tracker.autorun(() => {
        let selectedLicenseContract = this.data.licenseContract;
        if (selectedLicenseContract) {
            selectedLicenseContract = selectedLicenseContract.toLowerCase();
        }
        let selectedIssuanceID = Number(this.data.issuanceID);
        
        const issuanceLocations = lob.balances.getNonZeroBalanceIssuanceLocations(selectedSenderAccount.get())
            .map((issuanceLocation) => {
                return {
                    issuanceLocation,
                    metadata: lob.issuances.getIssuance(issuanceLocation) || {},
                    selected: (issuanceLocation.licenseContractAddress.toLowerCase() === selectedLicenseContract && issuanceLocation.issuanceID === selectedIssuanceID),
                }
            })
            .filter((obj) => !obj.metadata.revoked)
            .filter((obj) => lob.balances.getOwnedBalance(obj.issuanceLocation, selectedSenderAccount.get()) > 0);
        this.issuanceLocations.set(issuanceLocations);

        setTimeout(() => this.onFormUpdate(), 0);
    });
    this.computations.add(issuanceLocationsComputation);

    const validateGasEstimate = Tracker.autorun(() => {
        // Trigger a form validation when the estimatedGasConsumption changes
        this.estimatedGasConsumption.get();
        this.validate();
    });
    this.computations.add(validateGasEstimate);
});

Template.transfer.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.transfer.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    issuances() {
        return Template.instance().issuanceLocations.get();
    },
    amount() {
        return this.amount;
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    },
    destroyLink() {
        return Template.instance().destroyLink.get();
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

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {sender, issuanceLocation, recipient, amount, gasPrice} = Template.instance().getValues();

        if (Template.instance().data && Template.instance().data.allowReclaim) {
            lob.transfer.transferLicenseAndAllowReclaim(issuanceLocation, sender, recipient, amount, gasPrice, (error) => {
                if (error) {
                    NotificationCenter.showError(error);
                    return;
                }
                NotificationCenter.showTransactionSubmitted();
                Router.go('licenses');
            });
        } else {
            lob.transfer.transferLicense(issuanceLocation, sender, recipient, amount, gasPrice, (error) => {
                if (error) {
                    NotificationCenter.showError(error);
                    return;
                }
                NotificationCenter.showTransactionSubmitted();
                Router.go('licenses');
            });
        }
    }
});

Template.issuanceOption.helpers({
    issuanceLocation() {
        return this.issuanceLocation;
    },
    preselected() {
        return this.selected ? 'selected' : '';
    },
    description() {
        return this.metadata.description;
    },
    balance() {
        return lob.balances.getOwnedBalance(this.issuanceLocation, selectedSenderAccount.get());
    },
});
