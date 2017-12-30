import {lob} from "../../lib/LOB";
import {formatDate} from "../../lib/utils";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {LicenseContractInfo} from "./licenseContractInfo";

export const IssuanceInfo = {
    show(issuanceLocation) {
        EthElements.Modal.show({
            template: 'issuanceInfo',
            data: {issuanceLocation},
            class: 'mediumModal'
        });
    }
};

Template.issuanceInfo.onCreated(function() {
    this.data.issuance = new ReactiveVar({});
    this.data.balances = new ReactiveVar([]);

    Tracker.autorun(() => {
        this.data.issuance.set(lob.issuances.getIssuance(this.data.issuanceLocation));
    });

    Tracker.autorun(() => {
        lob.balances.getLicenseTransfers(this.data.issuanceLocation, (error, transfers) => {
            if (error) { handleUnknownEthereumError(error); return; }
            const snapshots = lob.computeBalanceSnapshots(transfers);
            const lastSnapshot = snapshots[snapshots.length - 1];
            const balances = Object.entries(lastSnapshot)
                .map(([address, balance]) => {
                    return {address, balance}
                })
                .filter((entry) => entry.balance > 0);
            this.data.balances.set(balances);
        })
    });
});


Template.issuanceInfo.helpers({
    licenseContract() {
        return this.issuance.get().licenseContract;
    },
    issuanceID() {
        return this.issuance.get().issuanceID;
    },
    description() {
        return this.issuance.get().description;
    },
    code() {
        return this.issuance.get().code;
    },
    originalOwner() {
        return this.issuance.get().originalOwner;
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
    balances() {
        return this.balances.get();
    }
});

Template.issuanceInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
    'click a.showLicenseContractInfo'() {
        LicenseContractInfo.show(Template.instance().data.issuanceLocation.licenseContractAddress)
    },
    'click button.showCertificate'() {
        EthElements.Modal.show({
            template: 'licenseCertificate',
            data: {
                issuanceLocation: Template.instance().data.issuanceLocation,
            },
            class: 'wideModal'
        });
    },
    'click button.showTransferHistory'() {
        EthElements.Modal.show({
            template: 'licenseHistory',
            data: {
                issuanceLocation: Template.instance().data.issuanceLocation,
            },
            class: 'wideModal'
        });
    }
});