import {Marketplace} from "../../lib/Marketplace";
import {Settings} from "../../lib/Settings";

Template.marketplaceOffers.helpers({
    offers() {
        return Marketplace.getOffers();
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
        return this.price.toLocaleString(Settings.language.get(), {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
});
