import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {Marketplace} from "../../lib/Marketplace";
import {EthAccounts} from "meteor/ethereum:accounts";
import {EthNotificationCenter} from "../../lib/lob/EthNotificationCenter";

const selectedSellerAccount = new ReactiveVar(null);

function getValues() {
    const account = TemplateVar.getFrom(this.find('[name=account]'), 'value').toLowerCase();
    const name = this.find('[name=name]').value;
    const email = this.find('[name=email]').value;

    return {account, name, email};
}

function onFormUpdate() {
    const {account} = this.getValues();

    selectedSellerAccount.set(account);

    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {name, email} = this.getValues();

    let noErrors = true;

    noErrors &= validateField('name', name !== '', errorOnEmpty, TAPi18n.__('editAccountDetails.error.no_name'), errorMessages);
    noErrors &= validateField('email', email !== '', errorOnEmpty, TAPi18n.__('editAccountDetails.error.no_email'), errorMessages);

    return noErrors;
}

Template.editAccountDetails.onCreated(function() {
    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.getAccountDetails = function() {
        const account = selectedSellerAccount.get();
        if (account) {
            return Marketplace.getAccountDetails(account) || {};
        } else {
            return {};
        }
    };

    setTimeout(() => this.onFormUpdate(), 0);
});

Template.editAccountDetails.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    name() {
        return Template.instance().getAccountDetails().name;
    },
    email() {
        return Template.instance().getAccountDetails().email;
    }
});

Template.editAccountDetails.events({
    'click #submit'(event) {
        event.preventDefault();

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {account, name, email} = Template.instance().getValues();

        Marketplace.updateAccount(account, name, email, NotificationCenter.showError, () => {
            NotificationCenter.showSuccess(TAPi18n.__('editAccountDetails.notification.account_changed'));

            if (this.origin) {
                Router.go(this.origin);
            } else {
                Router.go('marketplace.offers');
            }
        });
    },
    'click #deleteAccount'(event) {
        event.preventDefault();

        const {account} = Template.instance().getValues();

        const offersByAccount = Marketplace.getOffers({seller: account});
        console.log(offersByAccount);

        let confirmationMessage;
        if (offersByAccount.length === 0) {
            confirmationMessage = TAPi18n.__('editAccountDetails.confirmation.deleteAccount_noOffers');
        } else {
            confirmationMessage = TAPi18n.__('editAccountDetails.confirmation.deleteAccount', {count: offersByAccount.length});
        }
        if (!confirm(confirmationMessage)) {
            return;
        }

        Marketplace.deleteAccount(account, NotificationCenter.showError, () => {
            NotificationCenter.showSuccess(TAPi18n.__('editAccountDetails.notification.account_deleted'));
            Router.go('licenses');
        });
    }
});
