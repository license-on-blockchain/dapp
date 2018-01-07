import {lob} from "../../lib/LOB";
import {Accounts} from "../../lib/Accounts";
import {LicenseContractInfo} from "../shared/licenseContractInfo";

const defaultTransactionLimit = 3; // Should be odd so that show all row is white

Template.managedLicenseContractList.onCreated(function() {
    this.showAllTransactions = new ReactiveVar(false);
});

Template.managedLicenseContractList.helpers({
    licenseContracts() {
        return lob.licenseContracts.getManagedLicenseContracts(Accounts.get())
            .sort()
            .map((licenseContract) => {
                return {
                    address: licenseContract
                }
            });
    },
    hasTransactions() {
        const limit = Template.instance().showAllTransactions.get() ? 0 : defaultTransactionLimit;
        return lob.transactions.getLatestLicenseContractTransactions(limit).count() > 0;
    },
    latestLicenseContractTransactions() {
        const limit = Template.instance().showAllTransactions.get() ? 0 : defaultTransactionLimit;
        return lob.transactions.getLatestLicenseContractTransactions(limit);
    },
    showingAllTransactions() {
        return Template.instance().showAllTransactions.get() || lob.transactions.getLatestLicenseContractTransactions(0).count() <= defaultTransactionLimit;
    }
});

Template.managedLicenseContractList.events({
    'click button.createLicenseContract'(event) {
        event.preventDefault();
        Router.go('licensecontracts.create');
    },
    'click tr.showAllRow'() {
        Template.instance().showAllTransactions.set(true);
    }
});

Template.licenseContractRow.helpers({
    address() {
        return this.address;
    },
    signed() {
        return lob.licenseContracts.isSigned(this.address);
    },
    signaturePending() {
        return lob.transactions.hasPendingSigningTransaction(this.address);
    },
    disablingPending() {
        return lob.transactions.hasPendingDisablingTransaction(this.address);
    },
    disabled() {
        return lob.licenseContracts.isDisabled(this.address);
    }
});

Template.licenseContractRow.events({
    'click tr'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            // Don't show license contract info if a button link was clicked
            return;
        }
        LicenseContractInfo.show(this.address);
    }
});