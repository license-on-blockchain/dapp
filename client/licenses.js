import { lob } from "../lib/LOB.js";

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
        return Object.values(this.balance.get()).reduce((a, b) => a.plus(b), new BigNumber(0)).toString();
    },
    maxBalanceAddress() {
        return Object.entries(this.balance.get()).reduce(([lhsAddress, lhsBalance], [rhsAddress, rhsBalance]) => lhsBalance.comparedTo(rhsBalance) < 0 ? [rhsAddress, rhsBalance] : [lhsAddress, lhsBalance])[0];
    }
});