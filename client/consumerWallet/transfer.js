import { EthAccounts } from 'meteor/ethereum:accounts';
import { lob } from "../../lib/LOB";
import { IssuanceLocation } from "../../lib/IssuanceLocation";
import { handleUnknownEthereumError } from "../../lib/ErrorHandling";
import { resetErrors, validateField } from "../../lib/FormHelpers";
import { NotificationCenter } from "../../lib/NotificationCenter";

const selectedSenderAccount = new ReactiveVar();

function getValues() {
    const sender = TemplateVar.getFrom(this.find('[name=sender]'), 'value');
    const [issuanceID, licenseContract] = this.find('[name=issuance]').value.split("|");
    const issuanceLocation = IssuanceLocation.fromComponents(licenseContract, issuanceID);
    let recipient;
    if (this.data && this.data.destroy) {
        recipient = "0x0000000000000000000000000000000000000000";
    } else {
        recipient = TemplateVar.getFrom(this.find('[name=recipient]'), 'value');
    }
    const amount = this.find('[name=amount]').value;
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    return {sender, issuanceID, licenseContract, recipient, amount, gasPrice, issuanceLocation};
}

function onFormUpdate() {
    const {sender, recipient, amount, issuanceLocation} = this.getValues();

    if (this.data && this.data.allowReclaim) {
        lob.estimateGasTransferLicenseAndAllowReclaim(issuanceLocation, sender, recipient, amount, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.estimatedGasConsumption.set(value);
        });
    } else {
        lob.estimateGasTransferLicense(issuanceLocation, sender, recipient, amount, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.estimatedGasConsumption.set(value);
        });
    }

    selectedSenderAccount.set(sender);

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => {
        this.validate();
    }, 0);
}

function validate(errorOnEmpty = false) {
    this.resetErrors();

    const {sender, issuanceID, issuanceLocation, recipient, amount} = this.getValues();
    let noErrors = true;

    // TODO: Check if private key exists for account
    // TODO: i18n
    noErrors &= validateField('sender', web3.isAddress(sender), true);
    noErrors &= validateField('recipient', web3.isAddress(recipient), errorOnEmpty, "Not a valid recipient address");
    noErrors &= validateField('issuance', issuanceID, errorOnEmpty, "You must select an issuance to transfer");
    noErrors &= validateField('amount', amount, errorOnEmpty, "You must specify how many licenses you want to transfer");
    noErrors &= validateField('amount', amount > 0, amount, "You need to transfer at least one license");
    noErrors &= validateField('amount', amount <= lob.getBalances(issuanceLocation).getOwnedBalance(sender).toNumber(), amount, "You cannot transfer more licenses than you own");

    return noErrors;
}

Template.transfer.onCreated(function() {
    EthAccounts.init();
    EthBlocks.init();

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.estimatedGasConsumption = new ReactiveVar(0);

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
            })
            .filter((obj) => obj.balance.getOwnedBalance(selectedSenderAccount.get()) > 0);
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
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
            lob.transferLicenseAndAllowReclaim(issuanceLocation, sender, recipient, amount, gasPrice, (error) => {
                if (error) {
                    NotificationCenter.showError(error);
                    return;
                }
                NotificationCenter.showTransactionSubmitted();
            });
        } else {
            lob.transferLicense(issuanceLocation, sender, recipient, amount, gasPrice, (error) => {
                if (error) {
                    NotificationCenter.showError(error);
                    return;
                }
                NotificationCenter.showTransactionSubmitted();
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
