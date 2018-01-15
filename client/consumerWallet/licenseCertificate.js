import {lob} from "../../lib/LOB";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {CertificateChain} from "../../lib/CertificateChain";
import {formatDate} from "../../lib/utils";
import {Accounts} from "../../lib/Accounts";

function transferDescription(transfers, issuanceLocation) {
    switch (transfers.length) {
        case 1:
            return TAPi18n.__('licenseCertificate.transferDescription.licenses_not_transferred');
        case 2:
            const recipient = transfers[1].args.to + ((Accounts.get().indexOf(transfers[1].args.to) !== -1) ? " (Ihre Adresse)" : "");
            if (transfers[0].args.amount === transfers[1].args.amount) {
                return TAPi18n.__('licenseCertificate.transferDescription.licenses_completely_transferred', recipient);
            } else {
                return TAPi18n.__("licenseCertificate.transferDescription.licenses_partially_transferred", {numLicenses: String(transfers[1].args.amount), recipient});
            }
        default:
            let snapshots;
            try {
                snapshots = lob.computeBalanceSnapshots(transfers, issuanceLocation);
            } catch (error) {
                return '';
            }
            const latestSnapshot = snapshots[snapshots.length - 1].balances;
            let userBalance = 0;
            for (const address of Object.keys(latestSnapshot)) {
                if (Accounts.get().indexOf(address) !== -1) {
                    userBalance += latestSnapshot[address];
                }
            }
            if (userBalance === transfers[0].args.amount) {
                return TAPi18n.__('licenseCertificate.transferDescription.licenses_completely_transferred_indirectly');
            } else if (userBalance === 0) {
                return TAPi18n.__('licenseCertificate.transferDescription.no_owned_licenses');
            } else {
                return TAPi18n.__('licenseCertificate.transferDescription.licenses_partially_transferred_indirectly', userBalance);
            }
    }
}

Template.licenseCertificate.onCreated(function() {
    this.computations = new Set();

    const issuanceLocation = this.data.issuanceLocation;
    const licenseContractAddress = issuanceLocation.licenseContractAddress;
    this.licenseContract = licenseContractAddress;

    this.signDate = new ReactiveVar("…");
    const signDateComputation = Tracker.autorun(() => {
        const signDate = lob.licenseContracts.getSignDate(this.licenseContract);
        this.signDate.set(signDate);
    });
    this.computations.add(signDateComputation);

    this.certificateText = new ReactiveVar(TAPi18n.__("generic.loading"));
    const certificateTextComputation = Tracker.autorun(() => {
        const certificateText = lob.licenseContracts.getCertificateText(licenseContractAddress);
        if (certificateText) {
            this.certificateText.set(certificateText);
        }
    });
    this.computations.add(certificateTextComputation);

    this.issuance = lob.issuances.getIssuance(issuanceLocation);

    this.transferDescription = new ReactiveVar("…");
    lob.balances.getLicenseTransfers(issuanceLocation, (error, transfers) => {
        if (error) { handleUnknownEthereumError(error); return; }
        this.transferDescription.set(transferDescription(transfers, issuanceLocation));
    });
});

Template.licenseCertificate.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.licenseCertificate.helpers({
    certificateText() {
        // Split text on newlines to insert <br> for newlines in the template an retain safe substrings
        return Template.instance().certificateText.get().split('\n');
    },
    sslCertificate() {
        const sslCertificate = lob.licenseContracts.getSSLCertificate(Template.instance().licenseContract);
        const certificateChain = new CertificateChain(sslCertificate);
        return certificateChain.getLeafCertificatePublicKeyFingerprint();
    },
    signDate() {
        const signDate = Template.instance().signDate.get();
        if (signDate) {
            return formatDate(signDate);
        } else {
            return null;
        }
    },
    issuanceID() {
        return Template.instance().data.issuanceLocation.issuanceID;
    },
    issuerName() {
        return lob.licenseContracts.getIssuerName(Template.instance().licenseContract);
    },
    originalOwner() {
        return Template.instance().issuance.originalOwner;
    },
    auditTime() {
        return formatDate(new Date(Template.instance().issuance.auditTime * 1000));
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
    licenseContract() {
        return Template.instance().licenseContract;
    }
});

Template.licenseCertificate.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});