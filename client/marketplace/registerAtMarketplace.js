import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {Marketplace} from "../../lib/Marketplace";

export const RegisterAtMarketplace = {
    show(account) {
        EthElements.Modal.show({
            template: 'registerAtMarketplace',
            data: {account},
            class: 'mediumModal'
        }, {
            closeable: false
        });
    }
};

function getValues() {
    const name = this.find('[name=register-name]').value;
    const email = this.find('[name=register-email]').value;

    return {name, email};
}

function onFormUpdate() {
    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {name, email} = this.getValues();

    let noErrors = true;

    noErrors &= validateField('register-name', name !== '', errorOnEmpty, TAPi18n.__('registerAtMarketplace.error.no_name'), errorMessages);
    noErrors &= validateField('register-email', email !== '', errorOnEmpty, TAPi18n.__('registerAtMarketplace.error.no_email'), errorMessages);

    return noErrors;
}

Template.registerAtMarketplace.onCreated(function() {
    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.registerAtMarketplace.events({
    'click #register'(event) {
        event.preventDefault();

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {name, email} = Template.instance().getValues();

        Marketplace.updateAccount(this.account, name, email, NotificationCenter.showError, () => {
            NotificationCenter.showSuccess(TAPi18n.__('registerAtMarketplace.notification.successfully_registered'));
            setTimeout(() => { EthElements.Modal.hide() }, 0);
        });
    },
    'click #cancel'(event) {
        event.preventDefault();

        Router.go('marketplace.offers');
        EthElements.Modal.hide();
    }
});
