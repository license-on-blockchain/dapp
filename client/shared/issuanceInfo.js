import {lob} from "../../lib/LOB";
import {formatDate} from "../../lib/utils";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {LicenseContractInfo} from "./licenseContractInfo";
import {AccountInfo} from "./accountInfo";
import {Settings} from "../../lib/Settings";
import {Marketplace} from "../../lib/Marketplace";

export const IssuanceInfo = {
    show(issuanceID) {
        EthElements.Modal.show({
            template: 'issuanceInfo',
            data: {issuanceID},
            class: 'mediumModal'
        });
    }
};

Template.issuanceInfo.onCreated(function() {
    this.computations = new Set();

    const issuanceID = this.data.issuanceID;
    this.data.issuance = {
        get() {
            return lob.issuances.getIssuance(issuanceID);
        }
    };

    this.data.balances = new ReactiveVar([]);
    const balancesComputation = Tracker.autorun(() => {
        lob.balances.getLicenseTransfers(this.data.issuanceID, (error, transfers) => {
            if (error) { handleUnknownEthereumError(error); return; }
            try {
                const snapshots = lob.computeBalanceSnapshots(transfers, issuanceID);
                const lastSnapshot = snapshots[snapshots.length - 1].balances;
                const balances = Object.entries(lastSnapshot)
                    .map(([address, balance]) => {
                        return {address, balance}
                    })
                    .filter((entry) => entry.balance > 0);
                this.data.balances.set(balances);
            } catch (error) {
                this.data.balances.set([]);
            }
        })
    });
    this.computations.add(balancesComputation);
});

Template.issuanceInfo.onRendered(function() {
    const internalNameUpdate = Tracker.autorun(() => {
        const issuance = lob.issuances.getIssuance(this.data.issuanceID);
        const internalComment = issuance ? issuance.internalComment : "";
        this.$('.internalComment').html(internalComment);
    });
    this.computations.add(internalNameUpdate);
});

Template.issuanceInfo.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.issuanceInfo.helpers({
    licenseContract() {
        return this.issuance.get().licenseContract;
    },
    issuerName() {
        const licenseContractAddress = this.issuance.get().licenseContract;
        return lob.licenseContracts.getIssuerName(licenseContractAddress);
    },
    issuanceNumber() {
        return this.issuance.get().issuanceNumber;
    },
    description() {
        return this.issuance.get().description;
    },
    code() {
        return this.issuance.get().code;
    },
    certificateValidationError() {
        return lob.licenseContracts.getSignatureValidationError(this.issuanceID.licenseContractAddress);
    },
    originalSupply() {
        return this.issuance.get().originalSupply;
    },
    auditTime() {
        return formatDate(new Date(this.issuance.get().auditTime * 1000));
    },
    auditRemark() {
        return this.issuance.get().auditRemark;
    },
    revoked() {
        return this.issuance.get().revoked;
    },
    revocationReason() {
        return this.issuance.get().revocationReason;
    },
    balances() {
        return this.balances.get();
    },
    offers() {
        if (!Settings.enableMarketplace.get()) {
            return null;
        }
        return Marketplace.getOffers({issuanceID: this.issuanceID});
    }
});

Template.issuanceInfo.events({
    'blur .internalComment'(event) {
        const comment = event.target.innerText.trim();
        lob.issuances.setInternalComment(Template.instance().data.issuanceID, comment)
    },
    'keypress .internalComment'(event) {
        if (event.keyCode === 13) { // Enter
            event.target.blur();
        }
    },
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
    'click a.showLicenseContractInfo'(event) {
        event.preventDefault();
        LicenseContractInfo.show(Template.instance().data.issuanceID.licenseContractAddress)
    },
    'click button.showCertificate'() {
        EthElements.Modal.show({
            template: 'licenseCertificate',
            data: {
                issuanceID: Template.instance().data.issuanceID,
            },
            class: 'wideModal'
        });
    },
    'click button.showTransferHistory'() {
        EthElements.Modal.show({
            template: 'licenseHistory',
            data: {
                issuanceID: Template.instance().data.issuanceID,
            },
            class: 'wideModal'
        });
    },
    'click tr.balanceRow'() {
        AccountInfo.show(this.address);
    }
});

Template.forSaleOffer.events({
    'click .showSeller'() {
        AccountInfo.show(this.seller);
    }
});
