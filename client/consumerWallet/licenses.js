import {lob} from "../../lib/LOB.js";
import {drawLicenseHistory} from '../../lib/licenseHistory';
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {CertificateChain} from "../../lib/CertificateChain";
import {Accounts} from "../../lib/Accounts";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {formatDate} from "../../lib/utils";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {TransferTransactionInfo} from "../transactionInfo/transferTransactionInfo";
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
        return Accounts.get()
    },
    hasPendingTransfers() {
        return lob.transactions.getLatestTransfers().count() > 0;
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