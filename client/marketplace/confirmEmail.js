import {Marketplace} from "../../lib/Marketplace";
import {lob} from "../../lib/LOB";
import {Accounts} from "../../lib/Accounts";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

const message = new ReactiveVar("…");
const success = new ReactiveVar(false);

Template.confirmEmail.onRendered(function() {
    success.set(false);

    let {account, challenge} = this.data;

    if (!web3.isAddress(account) || !challenge) {
        message.set(TAPi18n.__('confirmEmail.error.invalid_url'));
        return;
    }

    account = account.toLowerCase();

    Accounts.fetch((accounts) => {
        if (accounts.indexOf(account)) {
            message.set(TAPi18n.__('confirmEmail.error.address_not_in_wallet', {address: account}));
            return;
        }
        Marketplace.confirmEmail(account, challenge, (error) => {
            if (error.domain === "account.confirmEmailAddress") {
                if (error.code === 5210) {
                    message.set(TAPi18n.__('confirmEmail.error.email_address_already_verified', {address: account}));
                } else {
                    message.set(error.message);
                }
            } else {
                handleUnknownEthereumError(error);
            }
        }, () => {
            message.set(TAPi18n.__('confirmEmail.error.email_address_confirmed', {address: account}));
            success.set(true);
        });
    });
});

Template.confirmEmail.helpers({
    message() {
        return message.get();
    },
    success() {
        return success.get();
    }
});


Template.confirmEmail.events({
    'click #goToMarketplace'(event) {
        event.preventDefault();
        Router.go('marketplace.offers');
    }
});
