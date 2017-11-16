import { lob } from "../lib/LOB.js";

Template.licenses.helpers({
    licenses() {
        return Object.values(lob.allWatchedIssuances.get()).filter((obj) => !obj.revoked.get());
    },
    revokedLicenses() {
        return Object.values(lob.allWatchedIssuances.get()).filter((obj) => obj.revoked.get());
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

Template.licenseRow.events({
    'click a.showCertificate'() {
        EthElements.Modal.show({
            template: 'licenseCertificate',
            data: {
                licenseContract: Template.instance().data.licenseContract,
                issuanceID: Template.instance().data.issuanceID,
            },
            class: 'certificateModal'
        });
    }
});

Template.licenseCertificate.onCreated(async function() {
    // TODO: i18n
    this.certificateText = new ReactiveVar("Loading…");
    lob.getCertificateText(Template.instance().data.licenseContract, (error, value) => {
        this.certificateText.set(value);
    });
});

Template.licenseCertificate.helpers({
    certificateText() {
        // Split text on newlines to insert <br> for newlines in the template an retain safe substrings
        return Template.instance().certificateText.get().split('\n');
    }
});

Template.licenseCertificate.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});