import {Marketplace} from "../../lib/Marketplace";
import {lob} from "../../lib/LOB";
import {EthAccounts} from "meteor/ethereum:accounts";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";

const selectedSellerAccount = new ReactiveVar('');

function getValues() {
    const seller = TemplateVar.getFrom(this.find('[name=seller]'), 'value').toLowerCase();
    const issuanceID = TemplateVar.getFrom(this.find('.selectIssuance'), 'value');
    const amount = Number(this.find('[name=amount]').value);
    const price = Number(this.find('[name=price]').value);
    const negotiable = this.find('[name=negotiable]').checked;
    const soldSeparately = this.find('[name=soldSeparately]').checked;
    
    return {seller, issuanceID, amount, price, negotiable, soldSeparately};
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {seller, issuanceID, amount, price} = this.getValues();

    let noErrors = true;

    noErrors &= validateField('seller', web3.isAddress(seller), true, null, errorMessages);
    noErrors &= validateField('issuance', issuanceID, errorOnEmpty, TAPi18n.__('offerForSale.error.no_issuance_selected'), errorMessages);
    noErrors &= validateField('amount', amount, errorOnEmpty, TAPi18n.__('offerForSale.error.no_amount_specified'), errorMessages);
    noErrors &= validateField('amount', amount > 0, amount, TAPi18n.__('offerForSale.error.amount_zero'), errorMessages);
    noErrors &= validateField('amount', () => amount <= lob.balances.getProperBalance(issuanceID, seller), issuanceID && amount, TAPi18n.__('offerForSale.error.amount_less_than_balance'));
    noErrors &= validateField('price', price >= 0, true, TAPi18n.__('offerForSale.error.price_negative'));

    return noErrors;
}

function onFormUpdate() {
    const {seller} = this.getValues();

    selectedSellerAccount.set(seller);

    setTimeout(() => this.validate(), 0);
}

Template.offerForSale.onCreated(function() {
    this.computations = new Set();

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.issuances = new ReactiveVar([]);

    setTimeout(() => this.onFormUpdate(), 0);
});

Template.offerForSale.onRendered(function() {
    const issuanceIDsComputation = Tracker.autorun(() => {
        let selectedLicenseContract = this.data.licenseContract;
        if (selectedLicenseContract) {
            selectedLicenseContract = selectedLicenseContract.toLowerCase();
        }
        let selectedIssuanceNumber = Number(this.data.issuanceNumber);

        const issuanceIDs = lob.balances.getNonZeroBalanceIssuanceIDs(selectedSellerAccount.get())
            .map((issuanceID) => {
                return {
                    issuanceID,
                    metadata: lob.issuances.getIssuance(issuanceID) || {},
                    selected: (issuanceID.licenseContractAddress.toLowerCase() === selectedLicenseContract && issuanceID.issuanceNumber === selectedIssuanceNumber),
                    balance: lob.balances.getProperBalance(issuanceID, selectedSellerAccount.get())
                }
            })
            .filter((obj) => !obj.metadata.revoked)
            .filter((obj) => obj.balance > 0)
            .sort((lhs, rhs) => {
                if (lhs.metadata.description) {
                    return lhs.metadata.description.localeCompare(rhs.metadata.description);
                } else {
                    return -1;
                }
            });
        this.issuances.set(issuanceIDs);

        setTimeout(() => this.onFormUpdate(), 0);
    });
    this.computations.add(issuanceIDsComputation);
});

Template.offerForSale.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.offerForSale.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    email() {
        const account = selectedSellerAccount.get();
        if (account) {
            return Marketplace.getEmailAddress(account);
        } else {
            return '…';
        }
    },
    issuances() {
        return Template.instance().issuances.get();
    },
});

Template.offerForSale.events({
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

        const {seller, issuanceID, amount, price, negotiable, soldSeparately} = Template.instance().getValues();

        Marketplace.submitOffer(seller, issuanceID, price, amount, soldSeparately, negotiable, (error) => {
            NotificationCenter.showError(error);
        }, () => {
            NotificationCenter.showSuccess(TAPi18n.__('offerForSale.notification.offer_submitted'));
            Router.go('marketplace.offers');
        });
    },
});
