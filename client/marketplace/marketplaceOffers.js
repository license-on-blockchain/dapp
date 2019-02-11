import {Marketplace} from "../../lib/Marketplace";
import {Settings} from "../../lib/Settings";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {Accounts} from "../../lib/Accounts";

const search = new ReactiveVar(null);

Template.marketplaceOffers.helpers({
    offers() {
        return Marketplace.getOffers().filter((offer) => {
            let searchStr = search.get();
            if (searchStr !== null) {
                searchStr = searchStr.toLowerCase().trim();
                const searchTerms = searchStr.split('|');
                const issuance = lob.issuances.getIssuance(offer.issuanceID);
                if (issuance) {
                    const searchFields = [
                        issuance.description,
                        issuance.code,
                        offer.seller
                    ];
                    for (const field of searchFields) {
                        for (const searchTerm of searchTerms) {
                            if (field.toLowerCase().includes(searchTerm)) {
                                return true;
                            }
                        }
                    }
                    return false;
                }
            }
            return true;
        }).filter((offer) => {
            lob.watchAccountBalanceForIssuance(offer.seller, offer.issuanceID);
            const balance = lob.balances.getProperBalance(offer.issuanceID, offer.seller);
            return balance >= offer.amount;
        });
    },
    search() {
        return search.get();
    }
});

Template.marketplaceOffer.helpers({
    description() {
        const issuance = lob.issuances.getIssuance(this.issuanceID);
        if (issuance) {
            return issuance.description;
        } else {
            return "…";
        }
    },
    price() {
        if (this.price > 0) {
            return this.price.toLocaleString(Settings.language.get(), {minimumFractionDigits: 2, maximumFractionDigits: 2});
        } else {
            return '';
        }
    },
    offeredByCurrentUser() {
        const myAccounts = Accounts.get();
        return myAccounts.includes(this.seller);
    }
});

Template.marketplaceOffers.events({
    'keyup, change input#search'(event) {
        const value = Template.instance().find('#search').value;
        if (value) {
            search.set(value);
        } else {
            search.set(null);
        }
    },
    'submit form'(event) {
        event.preventDefault();
        Template.instance().find('#search').blur();
    },
    'click #showMyOffers'(event) {
        event.preventDefault();

        const searchField = Template.instance().find('#search');

        Accounts.fetch((accounts) => {
            const searchString = accounts.join('|');

            searchField.value = searchString;
            search.set(searchString);
        });
    },
    'click .offerRow'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            // Don't show issuance info if a button link was clicked
            return;
        }
        IssuanceInfo.show(this.issuanceID);
    }
});

Template.marketplaceOffer.helpers({
    licenseContract() {
        return this.issuanceID.licenseContractAddress;
    },
    issuanceNumber() {
        return this.issuanceID.issuanceNumber;
    }
});
