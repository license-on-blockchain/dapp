import {lob} from "../../lib/LOB";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";

const defaultTransactionLimit = 3; // Should be odd so that show all row is white

Template.manageLicenseContract.onCreated(function() {
    this.showAllTransactions = new ReactiveVar(false);
});

Template.manageLicenseContract.helpers({
    issuances() {
        return lob.issuances.getIssuancesOfLicenseContract(this.address);
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
        const issuanceLocation = IssuanceLocation.fromComponents(this.licenseContract, this.issuanceID);
        IssuanceInfo.show(issuanceLocation);
    },
    'click button.disableLicenseContract'(event) {
        event.preventDefault();
        Router.go('licenseContract.disable', {address: this.address});
    },
    'click tr.showAllRow'() {
        Template.instance().showAllTransactions.set(true);
    }
});

Template.issuanceRow.helpers({
    auditTime() {
        if (this.auditTime) {
            return formatDate(new Date(this.auditTime * 1000));
        } else {
            return this.auditTime;
        }
    }
});