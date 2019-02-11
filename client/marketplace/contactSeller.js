import {Marketplace} from "../../lib/Marketplace";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {IssuanceID} from "../../lib/IssuanceID";
import {EthAccounts} from "meteor/ethereum:accounts";
import {RegisterAtMarketplace} from "./registerAtMarketplace";

const selectedSenderAccount = new ReactiveVar(null);

function getValues() {
    const senderAccount = TemplateVar.getFrom(this.find('[name=sender]'), 'value').toLowerCase();
    const content = this.find('[name=content]').value;

    return {senderAccount, content};
}

function onFormUpdate() {
    const {senderAccount} = this.getValues();

    selectedSenderAccount.set(senderAccount);

    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {senderAccount, content} = this.getValues();

    let noErrors = true;

    noErrors &= validateField('sender', web3.isAddress(senderAccount), true, null, errorMessages);
    noErrors &= validateField('content', content !== '', errorOnEmpty, TAPi18n.__('contactSeller.error.no_content'), errorMessages);

    return noErrors;
}

Template.contactSeller.onCreated(function() {
    this.computations = new Set();

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.getIssuanceID = function() {
        return IssuanceID.fromComponents(this.data.licenseContract, this.data.issuanceNumber);
    };

    this.getOffer = function() {
        const offers = Marketplace.getOffers({issuanceID: this.getIssuanceID(), seller: this.seller});
        if (offers.length > 0) {
            return offers[0];
        } else {
            return null;
        }
    };

    this.getSenderDetails = function() {
        const sender = selectedSenderAccount.get();
        if (sender) {
            const details = Marketplace.getAccountDetails(sender);
            if (details) {
                return details;
            }
        }
        return {};
    };

    // Trigger a form update after everything has been created to set `selectedSenderAccount`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.contactSeller.onRendered(function() {
    const showRegisterPopoverComputation = Tracker.autorun(() => {
        const account = selectedSenderAccount.get();
        if (account) {
            if (!Marketplace.isAccountRegistered(account)) {
                RegisterAtMarketplace.show(account);
            }
        }
    });
    this.computations.add(showRegisterPopoverComputation);
});

Template.contactSeller.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.contactSeller.helpers({
    licenseDescription() {
        const issuance = lob.issuances.getIssuance(Template.instance().getIssuanceID());
        if (issuance) {
            return issuance.description;
        } else {
            return "…";
        }
    },
    amount() {
        const offer = Template.instance().getOffer();
        return offer ? offer.amount : "…";
    },
    soldSeparately() {
        const offer = Template.instance().getOffer();
        return offer ? offer.soldSeparately : true;
    },
    price() {
        const offer = Template.instance().getOffer();
        return offer ? offer.price : "…";
    },
    negotiable() {
        const offer = Template.instance().getOffer();
        return offer ? offer.negotiable : false;
    },
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    senderName() {
        const senderDetails = Template.instance().getSenderDetails();
        if (senderDetails) {
            return senderDetails.name;
        } else {
            return '';
        }
    },
    senderEmail() {
        const senderDetails = Template.instance().getSenderDetails();
        if (senderDetails) {
            return senderDetails.email;
        } else {
            return '';
        }
    },
    editAccountLink() {
        return '/marketplace/account/' + selectedSenderAccount.get() + '?origin=' + encodeURI(Iron.Location.get().path);
    }
});

Template.contactSeller.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click #send'(event) {
        event.preventDefault();

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {senderAccount, content} = Template.instance().getValues();
        const issuanceID = Template.instance().getIssuanceID();
        const seller = this.seller;

        Marketplace.sendMessage(senderAccount, issuanceID, seller, content, NotificationCenter.showError, (pending) => {
            if (pending) {
                NotificationCenter.showWarning(TAPi18n.__('contactSeller.notification.messageIsPending'));
            } else {
                NotificationCenter.showSuccess(TAPi18n.__('contactSeller.notification.messageSent'));
            }
            Router.go('marketplace.offers');
        });
    }
});
