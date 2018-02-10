import {lob} from "../../lib/LOB";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {IssuanceID} from "../../lib/IssuanceID";
import {formatDate} from "../../lib/utils";

const defaultTransactionLimit = 3; // Should be odd so that show all row is white

Template.manageLicenseContract.onCreated(function() {
    this.showAllTransactions = new ReactiveVar(false);
});

Template.manageLicenseContract.helpers({
    issuances() {
        const pendingIssuances = lob.transactions.getPendingIssuances(this.address).fetch();
        const issuances = lob.issuances.getIssuancesOfLicenseContract(this.address).fetch().reverse();
        return pendingIssuances.concat(issuances);
    },
    disabled() {
        return lob.licenseContracts.isDisabled(this.address);
    },
    hasTransactions() {
        return lob.transactions.getLatestLicenseContractTransactions(this.address, 1).count() > 0;
    },
    latestTransactions() {
        const limit = Template.instance().showAllTransactions.get() ? 0 : defaultTransactionLimit;
        return lob.transactions.getLatestLicenseContractTransactions(this.address, limit);
    },
    showingAllTransactions() {
        return Template.instance().showAllTransactions.get() || lob.transactions.getLatestLicenseContractTransactions(this.address, 0).count() <= defaultTransactionLimit;
    }
});

Template.manageLicenseContract.events({
    'click tr.issuancesRow'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            return;
        }
        if (typeof this.issuanceNumber === 'undefined') {
            return;
        }
        const issuanceID = IssuanceID.fromComponents(this.licenseContract, this.issuanceNumber);
        IssuanceInfo.show(issuanceID);
    },
    'click button.disableLicenseContract'(event) {
        event.preventDefault();
        Router.go('licenseContract.disable', {address: this.address});
    },
    'click button.issueLicense'(event) {
        event.preventDefault();
        Router.go('licensecontracts.issue.withAddress', {licenseContractAddress: this.address});
    },
    'click tr.showAllRow'() {
        Template.instance().showAllTransactions.set(true);
    }
});

Template.issuanceRow.helpers({
    isPending() {
        return typeof this.issuanceNumber === 'undefined';
    },
    clickable() {
        if (typeof this.issuanceNumber === 'undefined') {
            return '';
        } else {
            return 'clickable';
        }
    },
    auditTime() {
        if (this.auditTime) {
            return formatDate(new Date(this.auditTime * 1000));
        } else {
            return this.auditTime;
        }
    },
});