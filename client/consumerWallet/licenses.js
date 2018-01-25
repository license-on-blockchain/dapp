import {lob} from "../../lib/LOB.js";
import {Accounts} from "../../lib/Accounts";
import {InitialLoadingStatus} from "../../lib/InitialLoadingStatus";

const defaultTransactionLimit = 3; // Should be odd so that show all row is white

Template.licenses.onCreated(function() {
    this.showAllTransactions = new ReactiveVar(false);
});

Template.licenses.helpers({
    loading() {
        return !InitialLoadingStatus.hasFinishedLoading();
    },
    accounts() {
        return Accounts.get();
    },
    hasPendingTransfers() {
        const limit = Template.instance().showAllTransactions.get() ? 0 : defaultTransactionLimit;
        return lob.transactions.getLatestTransfers(limit).count() > 0;
    },
    recentTransfers() {
        const limit = Template.instance().showAllTransactions.get() ? 0 : defaultTransactionLimit;
        return lob.transactions.getLatestTransfers(limit);
    },
    showingAllTransactions() {
        return Template.instance().showAllTransactions.get() || lob.transactions.getLatestTransfers(0).count() <= defaultTransactionLimit;
    }
});

Template.licenses.events({
    'click tr.showAllRow'() {
        Template.instance().showAllTransactions.set(true);
    }
});