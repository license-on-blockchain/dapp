import { lob } from "../lib/LOB.js";

BigNumber.zero = new BigNumber(0);

Template.licenses.onCreated(function() {
    // TODO: Add all license contract created by root contracts and watch for new license contracts
    lob.watchLicenseContract("0xfD8F3a53e8445c19155d1E4d044C0A77EE6AEbef");
});

Template.licenses.helpers({
    licenses() {
        return Object.values(lob.allWatchedIssuances.get());
    }
});

Template.licenseRow.helpers({
    revoked() {
        if (typeof this.revoked === 'undefined') {
            return false;
        }
        return this.revoked.get();
    },
    balance() {
        // Compute total balance
        return Object.values(this.balance.get()).reduce((a, b) => a.plus(b), BigNumber.zero).toString();
    }
});