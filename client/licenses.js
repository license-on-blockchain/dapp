import { lob } from "../lib/LOB.js";
import { drawLicenseHistory } from '../lib/licenseHistory';
import { promisify } from "../lib/utils";
import { handleUnknownEthereumError } from "../lib/ErrorHandling";

Template.licenses.helpers({
    licenses() {
        return Object.values(lob.allWatchedIssuances.get()).filter((obj) => obj.revoked && !obj.revoked.get());
    },
    revokedLicenses() {
        return Object.values(lob.allWatchedIssuances.get()).filter((obj) => obj.revoked && obj.revoked.get());
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
        // Compute total proper balance
        const balance = Object.values(this.balance.get()).reduce((a, b) => a.plus(b), new BigNumber(0)).toString();
        const reclaimableBalance = Object.values(this.reclaimableBalance.get()).reduce((a, b) => a.plus(b), new BigNumber(0)).toString();
        return balance - reclaimableBalance;
    },
    reclaimableBalance() {
        return Object.values(this.reclaimableBalance.get()).reduce((a, b) => a.plus(b), new BigNumber(0)).toNumber();
    },
    maxBalanceAddress() {
        // TODO: Deduct reclaimable balance
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
            class: 'wideModal'
        });
    },
    'click a.showHistory'() {
        EthElements.Modal.show({
            template: 'licenseHistory',
            data: {
                licenseContract: Template.instance().data.licenseContract,
                issuanceID: Template.instance().data.issuanceID,
            },
            class: 'wideModal'
        });
    }
});

Template.licenseCertificate.onCreated(function() {
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

Template.licenseHistory.onRendered(function() {
    const canvas = Template.instance().find('#graphContainer');
    const licenseContract = lob.getLicenseContract(this.data.licenseContract);
    const issuerNameP = promisify(licenseContract.issuerName);
    const transfersP = promisify((cb) => licenseContract.Transfer({issuanceID: this.data.issuanceID}, {fromBlock: 0}).get(cb));
    Promise.all([issuerNameP, transfersP])
        .then(([issuerName, transfers]) => {
            drawLicenseHistory(canvas, transfers, issuerName);
        })
        .catch((error) => {
            handleUnknownEthereumError(error);
        });
});

Template.licenseHistory.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});