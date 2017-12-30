import {lob} from "../../lib/LOB.js";
import {drawLicenseHistory} from '../../lib/licenseHistory';
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {CertificateChain} from "../../lib/CertificateChain";
import {Accounts} from "../../lib/Accounts";

function getLicenseRows(revoked) {
    return lob.balances.getNonZeroBalanceIssuanceLocations(Accounts.get())
        .map((issuanceLocation) => {
            return {
                issuanceLocation: issuanceLocation,
                balance: lob.balances.getBalanceForIssuanceLocation(issuanceLocation),
                metadata: lob.issuances.getIssuance(issuanceLocation) || {}
            };
        })
        .filter((obj) => obj.metadata.revoked === revoked)
        .filter((obj) => obj.balance.getBalance(Accounts.get()) > 0)
        .sort((lhs, rhs) => {
            // Sort based on description
            const lhsDescription = lhs.metadata.description;
            const rhsDescription = rhs.metadata.description;
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
        return this.revoked;
    },
    balance() {
        return this.balance.getOwnedBalance(Accounts.get()).toNumber();
    },
    borrowedBalance() {
        return this.balance.getBorrowedBalance(Accounts.get()).toNumber();
    },
    maxBalanceAddress() {
        return this.balance.getAllOwnedBalances(Accounts.get()).reduce(([lhsAddress, lhsBalance], [rhsAddress, rhsBalance]) => {
            return lhsBalance.comparedTo(rhsBalance) < 0 ? [rhsAddress, rhsBalance] : [lhsAddress, lhsBalance];
        }, [undefined, new BigNumber(-1)])[0];
    },
    description() {
        return this.metadata.description;
    },
    revoked() {
        return this.metadata.revoked;
    },
    licenseContract() {
        return this.metadata.licenseContract;
    },
    issuanceID() {
        return this.metadata.issuanceID;
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
    switch (transfers.length) {
        case 1:
            return TAPi18n.__('licenses.transferDescription.licenses_not_transferred');
        case 2:
            const recipient = transfers[1].args.to + ((Accounts.get().indexOf(transfers[1].args.to) !== -1) ? " (Ihre Adresse)" : "");
            if (transfers[0].args.amount === transfers[1].args.amount) {
                return TAPi18n.__('licenses.transferDescription.licenses_completely_transferred', recipient);
            } else {
                return TAPi18n.__("licenses.transferDescription.licenses_partially_transferred", transfers[1].args.amount, recipient);
            }
        default:
            const snapshots = lob.computeBalanceSnapshots(transfers);
            const latestSnapshot = snapshots[snapshots.length - 1];
            let userBalance = 0;
            for (const address of Object.keys(latestSnapshot)) {
                if (Accounts.get().indexOf(address) !== -1) {
                    userBalance += latestSnapshot[address];
                }
            }
            if (userBalance === transfers[0].args.amount) {
                return TAPi18n.__('licenses.transferDescription.licenses_completely_transferred_indirectly');
            } else if (userBalance === 0) {
                return TAPi18n.__('licenses.transferDescription.no_owned_licenses');
            } else {
                return TAPi18n.__('licenses.transferDescription.licenses_partially_transferred_indirectly', userBalance);
            }
    }
}

function dateFormat(date) {
    return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
}

Template.licenseCertificate.onCreated(function() {
    const issuanceLocation = Template.instance().data.issuanceLocation;
    const licenseContractAddress = issuanceLocation.licenseContractAddress;

    this.certificateText = new ReactiveVar(TAPi18n.__("generic.loading"));
    Tracker.autorun(() => {
        const certificateText = lob.licenseContracts.getLicenseContract(licenseContractAddress).certificateText.get();
        if (certificateText) {
            this.certificateText.set(certificateText);
        }
    });

    this.issuance = lob.issuances.getIssuance(issuanceLocation);
    this.licenseContract = lob.licenseContracts.getLicenseContract(this.issuance.licenseContract);

    this.transferDescription = new ReactiveVar("…");
    lob.balances.getLicenseTransfers(issuanceLocation, (error, transfers) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.transferDescription.set(transferDescription(transfers));
    });

    this.certificateChain = new ReactiveVar(null);
    Tracker.autorun(() => {
        const sslCertificate = this.licenseContract.sslCertificate.get();
        if (sslCertificate) {
            try {
                this.certificateChain.set(new CertificateChain(sslCertificate))
            } catch (error) {
                this.certificateChain.set(null);
            }
        }
    });
});

Template.licenseCertificate.helpers({
    certificateText() {
        // Split text on newlines to insert <br> for newlines in the template an retain safe substrings
        return Template.instance().certificateText.get().split('\n');
    },
    sslCertificate() {
        const certificateChain = new CertificateChain(Template.instance().licenseContract.sslCertificate.get());
        return certificateChain.getLeafCertificatePublicKeyFingerprint();
    },
    issuanceID() {
        return Template.instance().data.issuanceID;
    },
    issuerName() {
        return Template.instance().licenseContract.issuerName;
    },
    originalOwner() {
        return Template.instance().issuance.originalOwner;
    },
    auditTime() {
        return dateFormat(new Date(Template.instance().issuance.auditTime * 1000));
    },
    originalSupply() {
        return Template.instance().issuance.originalSupply;
    },
    licenseDescription() {
        return Template.instance().issuance.description;
    },
    licenseCode() {
        return Template.instance().issuance.code;
    },
    auditRemark() {
        return Template.instance().issuance.auditRemark;
    },
    transferDescription() {
        return Template.instance().transferDescription.get();
    },
    certificateValid() {
        const certificateChain = Template.instance().certificateChain.get();
        if (certificateChain && certificateChain.verifyCertificateChain()) {
            return "✔"
        } else {
            return "❌";
        }
    },
    signatureValid() {
        const certificateText = Template.instance().certificateText.get();
        const signature = Template.instance().licenseContract.signature.get();
        const certificateChain = Template.instance().certificateChain.get();

        if (certificateChain && certificateChain.verifySignature(certificateText, signature)) {
            return "✔"
        } else {
            return "❌";
        }
    },
    leafCertificateCommonName() {
        const certificateChain = Template.instance().certificateChain.get();
        return certificateChain ? certificateChain.getLeafCertificateCommonName() : "–";
    },
    rootCertificateCommonName() {
        const certificateChain = Template.instance().certificateChain.get();
        return certificateChain ? certificateChain.getRootCertificateCommonName() : "–";
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

        const issuance = lob.issuances.getIssuance(issuanceLocation);
        const licenseContract = lob.licenseContracts.getLicenseContract(issuance.licenseContract);

        lob.balances.getLicenseTransfers(issuanceLocation, (error, transfers) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.autorun(() => {
                drawLicenseHistory(canvas, transfers, licenseContract.issuerName.get(), issuance.originalOwner);
            });
        });
    });
});

Template.licenseHistory.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});