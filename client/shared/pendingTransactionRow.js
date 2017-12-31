import {formatDate} from "../../lib/utils";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {TransactionType} from "../../lib/lob/Transactions";
import {IssuanceInfo as TransferTransactionInfo} from "./issuanceInfo";
import {LicenseContractCreationTransactionInfo} from "../issuerWallet/licenseContractCreationTransactionInfo";

Template.pendingTransactionRow.helpers({
    fullDate() {
        return formatDate(new Date(this.timestamp));
    },
    month() {
        const month = new Date(this.timestamp).getMonth() + 1;
        return TAPi18n.__('licenses.pendingTransactionRow.monthAbbrevations.' + month);
    },
    day() {
        return new Date(this.timestamp).getDate();
    },
    type() {
        if (this.transactionType === TransactionType.LicenseContractCreation) {
            return TAPi18n.__('licenses.pendingTransactionRow.transactionType.licenseContractCreation')
        } else if ([TransactionType.Transfer, TransactionType.Reclaim].indexOf(this.transactionType) !== -1) {
            let transactionType;
            switch (this.transactionType) {
                case TransactionType.Transfer:
                    if (this.reclaimable) {
                        transactionType = TAPi18n.__('licenses.pendingTransactionRow.transactionType.reclaimableTransfer');
                    } else {
                        transactionType = TAPi18n.__('licenses.pendingTransactionRow.transactionType.transfer');
                    }
                    break;
                case TransactionType.Reclaim:
                    transactionType = TAPi18n.__('licenses.pendingTransactionRow.transactionType.reclaim');
                    break;
            }
            const issuanceLocation = IssuanceLocation.fromComponents(this.licenseContract, this.issuanceID);
            let issuanceDescription = "…";
            const issuance = lob.issuances.getIssuance(issuanceLocation);
            if (issuance) {
                issuanceDescription = issuance.description;
            }
            return transactionType + " (" + issuanceDescription + ")";
        } else {
            return "";
        }
    },
    from() {
        switch (this.transactionType) {
            case TransactionType.Transfer:
            case TransactionType.Reclaim:
                return this.from;
            case TransactionType.LicenseContractCreation:
                return this.issuerAddress;
        }
    },
    to() {
        switch (this.transactionType) {
            case TransactionType.Transfer:
            case TransactionType.Reclaim:
                return this.to;
            case TransactionType.LicenseContractCreation:
                return this.licenseContract;
        }
    },
    confirmationStatus() {
        const currentBlock = EthBlocks.latest.number;
        if (this.blockNumber) {
            const confirmations = currentBlock - this.blockNumber;
            if (confirmations > 12) {
                return '';
            } else {
                return TAPi18n.__('generic.confirmation', {count: confirmations});
            }
        } else {
            return TAPi18n.__('licenses.pendingTransactionRow.unconfirmed');
        }
    }
});

Template.pendingTransactionRow.events({
    'click tr'() {
        switch (this.transactionType) {
            case TransactionType.Transfer:
            case TransactionType.Reclaim:
                TransferTransactionInfo.show(this.transactionHash);
                break;
            case TransactionType.LicenseContractCreation:
                LicenseContractCreationTransactionInfo.show(this.transactionHash);
                break;
        }
    }
});