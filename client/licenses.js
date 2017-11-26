import { lob } from "../lib/LOB.js";
import { drawLicenseHistory } from '../lib/licenseHistory';
import { promisify } from "../lib/utils";
import { handleUnknownEthereumError } from "../lib/ErrorHandling";
import { Issuance } from "../lib/Issuance";

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

function transferDescription(transfers) {
    // TODO: i18n
    switch (transfers.length) {
        case 1:
            return "Die Lizenzen wurden noch nicht weiter übertragen.";
            break;
        case 2:
            const recipient = transfers[1].args.to + ((web3.eth.accounts.indexOf(transfers[1].args.to) !== -1) ? " (Ihre Adresse)" : "");
            if (transfers[0].args.amount === transfers[1].args.amount) {
                return "Die Lizenzen wurden vollständig an " + recipient + " übertragen.";
            } else {
                return transfers[1].args.amount + " Lizenzen wurden an " + recipient + " übertragen.";
            }
        default:
            const snapshots = lob.computeBalanceSnapshots(transfers);
            const latestSnapshot = snapshots[snapshots.length - 1];
            let userBalance = 0;
            for (const address of Object.keys(latestSnapshot)) {
                if (web3.eth.accounts.indexOf(address) !== -1) {
                    userBalance += latestSnapshot[address];
                }
            }
            if (userBalance === transfers[0].args.amount) {
                return "Die Lizenzen wurden Ihnen vollständig, aber (teilweise) indirekt, d.h. über andere zwischenzeitliche Empfänger, übertragen.";
            } else if (userBalance === 0) {
                return "Sie besizten aktuell keine Lizenzen dieser Bescheinigung.";
            } else {
                return userBalance + " Lizenzen wurden Ihnen (möglicherweise) indirekt, d.h. über andere zwischenzeitliche Empfänger, übertragen.";
            }
    }
}

function dateFormat(date) {
    return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
}

Template.licenseCertificate.onCreated(function() {
    const licenseContractAddress = Template.instance().data.licenseContract;
    const issuanceID = Template.instance().data.issuanceID;

    // TODO: i18n
    this.certificateText = new ReactiveVar("Loading…");
    lob.getCertificateText(licenseContractAddress, (error, value) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.certificateText.set(value);
    });
    this.issuance = new ReactiveVar();
    lob.getIssuance(licenseContractAddress, issuanceID, (error, value) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.issuance.set(value);
    });
    this.sslCertificate = new ReactiveVar();
    lob.getIssuerCertificate(licenseContractAddress, (error, value) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.sslCertificate.set(value);
    });

    this.transferDescription = new ReactiveVar();
    lob.getLicenseTransfers(licenseContractAddress, issuanceID, (error, transfers) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.transferDescription.set(transferDescription((transfers)));
    });
});

Template.licenseCertificate.helpers({
    certificateText() {
        // Split text on newlines to insert <br> for newlines in the template an retain safe substrings
        return Template.instance().certificateText.get().split('\n');
    },
    sslCertificate() {
        return Template.instance().sslCertificate.get();
    },
    issuanceID() {
        return Template.instance().data.issuanceID;
    },
    originalOwner() {
        const issuance = Template.instance().issuance.get();
        return issuance ? issuance.originalOwner : "";
    },
    auditTime() {
        const issuance = Template.instance().issuance.get();
        return issuance ? dateFormat(new Date(Template.instance().issuance.get().auditTime.toNumber() * 1000)) : "";
    },
    originalSupply() {
        const issuance = Template.instance().issuance.get();
        return issuance ? issuance.originalSupply : "";
    },
    licenseDescription() {
        const issuance = Template.instance().issuance.get();
        return issuance ? issuance.description : "";
    },
    licenseCode() {
        const issuance = Template.instance().issuance.get();
        return issuance ? issuance.code : "";
    },
    auditRemark() {
        const issuance = Template.instance().issuance.get();
        return issuance ? issuance.auditRemark : "";
    },
    transferDescription() {
        return Template.instance().transferDescription.get();
    }
});

Template.licenseCertificate.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});

Template.licenseHistory.onRendered(function() {
    const canvas = Template.instance().find('#graphContainer');
    const licenseContractAddress = this.data.licenseContract;
    const issuanceID = this.data.issuanceID;
    const licenseContract = lob.getLicenseContract(this.data.licenseContract);
    const issuerNameP = promisify(licenseContract.issuerName);
    const issuanceP = promisify(cb => licenseContract.issuances(issuanceID, cb));
    const transfersP = promisify((cb) => lob.getLicenseTransfers(licenseContractAddress, issuanceID, cb));
    Promise.all([issuerNameP, transfersP, issuanceP])
        .then(([issuerName, transfers, issuance]) => {
            issuance = new Issuance(issuance);
            drawLicenseHistory(canvas, transfers, issuerName, issuance.originalOwner);
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