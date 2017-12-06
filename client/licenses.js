import { lob } from "../lib/LOB.js";
import { drawLicenseHistory } from '../lib/licenseHistory';
import { handleUnknownEthereumError } from "../lib/ErrorHandling";

function getLicenseRows(revoked) {
    return lob.getRelevantIssuanceLocations(lob.accounts.get())
        .map((issuanceLocation) => {
            return {
                issuanceLocation: issuanceLocation,
                balance: lob.getBalances(issuanceLocation),
                metadata: lob.getIssuanceMetadata(issuanceLocation)
            };
        })
        .filter((obj) => obj.metadata.revoked && (obj.metadata.revoked.get() === revoked))
        .filter((obj) => obj.balance.getBalance(lob.accounts.get()) > 0)
        .sort((lhs, rhs) => {
            // Sort based on description
            const lhsDescription = lhs.metadata.description.get();
            const rhsDescription = rhs.metadata.description.get();
            if (lhsDescription && rhsDescription) {
                if (lhsDescription < rhsDescription) {
                    return -1;
                } else if (lhsDescription > rhsDescription) {
                    return 1;
                } else {
                    return 0;
                }
            } else {
                return 0;
            }
        });
}

Template.licenses.helpers({
    licenses() {
        return getLicenseRows(/*revoked*/false);
    },
    revokedLicenses() {
        return getLicenseRows(/*revoked*/true);
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
        return this.balance.getOwnedBalance(lob.accounts.get()).toNumber();
    },
    borrowedBalance() {
        return this.balance.getBorrowedBalance(lob.accounts.get()).toNumber();
    },
    maxBalanceAddress() {
        return this.balance.getAllOwnedBalances(lob.accounts.get()).reduce(([lhsAddress, lhsBalance], [rhsAddress, rhsBalance]) => {
            return lhsBalance.comparedTo(rhsBalance) < 0 ? [rhsAddress, rhsBalance] : [lhsAddress, lhsBalance];
        }, [undefined, new BigNumber(-1)])[0];
    },
    description() {
        return this.metadata.description.get();
    },
    revoked() {
        return this.metadata.revoked.get();
    },
    licenseContract() {
        return this.issuanceLocation.licenseContractAddress;
    },
    issuanceID() {
        return this.issuanceLocation.issuanceID;
    }
});

Template.licenseRow.events({
    'click a.showCertificate'() {
        EthElements.Modal.show({
            template: 'licenseCertificate',
            data: {
                issuanceLocation: Template.instance().data.issuanceLocation,
            },
            class: 'wideModal'
        });
    },
    'click a.showHistory'() {
        EthElements.Modal.show({
            template: 'licenseHistory',
            data: {
                issuanceLocation: Template.instance().data.issuanceLocation,
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
            const recipient = transfers[1].args.to + ((lob.accounts.get().indexOf(transfers[1].args.to) !== -1) ? " (Ihre Adresse)" : "");
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
                if (lob.accounts.get().indexOf(address) !== -1) {
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
    const issuanceLocation = Template.instance().data.issuanceLocation;
    const licenseContractAddress = issuanceLocation.licenseContractAddress;

    // TODO: i18n
    this.certificateText = new ReactiveVar("Loading…");
    lob.getCertificateText(licenseContractAddress, (error, value) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.certificateText.set(value);
    });

    this.issuance = lob.getIssuanceMetadata(issuanceLocation);

    this.transferDescription = new ReactiveVar("…");
    lob.getLicenseTransfers(issuanceLocation, (error, transfers) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.transferDescription.set(transferDescription(transfers));
    });
});

Template.licenseCertificate.helpers({
    certificateText() {
        // Split text on newlines to insert <br> for newlines in the template an retain safe substrings
        return Template.instance().certificateText.get().split('\n');
    },
    sslCertificate() {
        return Template.instance().issuance.sslCertificate.get();
    },
    issuanceID() {
        return Template.instance().data.issuanceID;
    },
    originalOwner() {
        return Template.instance().issuance.originalOwner.get();
    },
    auditTime() {
        return dateFormat(new Date(Template.instance().issuance.auditTime.get().toNumber() * 1000));
    },
    originalSupply() {
        return Template.instance().issuance.originalSupply.get();
    },
    licenseDescription() {
        return Template.instance().issuance.description.get();
    },
    licenseCode() {
        return Template.instance().issuance.code.get();
    },
    auditRemark() {
        return Template.instance().issuance.auditRemark.get();
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
    this.autorun(() => {
        const issuanceLocation = this.data.issuanceLocation;
        const canvas = Template.instance().find('#graphContainer');

        const issuance = lob.getIssuanceMetadata(issuanceLocation);

        lob.getLicenseTransfers(issuanceLocation, (error, transfers) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.autorun(() => {
                drawLicenseHistory(canvas, transfers, issuance.issuerName.get(), issuance.originalOwner.get());
            });
        });
    });
});

Template.licenseHistory.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});