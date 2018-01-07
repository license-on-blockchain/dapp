import {formatDate} from "../../lib/utils";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {TransactionType} from "../../lib/lob/Transactions";
import {TransferTransactionInfo} from "../transactionInfo/transferTransactionInfo";
import {LicenseContractCreationTransactionInfo} from "../transactionInfo/licenseContractCreationTransactionInfo";
import {LicenseContractSigningTransactionInfo} from "../transactionInfo/licenseContractSigningTransactionInfo";
import {DisableLicenseContractTransactionInfo} from "../transactionInfo/disableLicenseContractTransactionInfo";
import {LicenseIssuingTransactionInfo} from "../transactionInfo/licenseIssuingTransactionInfo";
import {IssuanceRevokeTransactionInfo} from "../transactionInfo/issuanceRevokeTransactionInfo";
import {lob} from "../../lib/LOB";

Template.pendingTransactionRow.helpers({
    fullDate() {
        return formatDate(new Date(this.timestamp));
    },
    month() {
        const month = new Date(this.timestamp).getMonth() + 1;
        return TAPi18n.__('pendingTransactionRow.monthAbbrevations.' + month);
    },
    day() {
        return new Date(this.timestamp).getDate();
    },
    type() {
        switch (this.transactionType) {
            case TransactionType.Transfer:
            case TransactionType.Reclaim: {
                let transactionType;
                switch (this.transactionType) {
                    case TransactionType.Transfer:
                        if (this.reclaimable) {
                            transactionType = TAPi18n.__('pendingTransactionRow.transactionType.reclaimableTransfer');
                        } else {
                            transactionType = TAPi18n.__('pendingTransactionRow.transactionType.transfer');
                        }
                        break;
                    case TransactionType.Reclaim:
                        transactionType = TAPi18n.__('pendingTransactionRow.transactionType.reclaim');
                        break;
                }
                const issuanceLocation = IssuanceLocation.fromComponents(this.licenseContract, this.issuanceID);
                let issuanceDescription = "…";
                const issuance = lob.issuances.getIssuance(issuanceLocation);
                if (issuance) {
                    issuanceDescription = issuance.description;
                }
                return transactionType + " (" + issuanceDescription + ")";
            }
            case TransactionType.LicenseContractCreation:
                return TAPi18n.__('pendingTransactionRow.transactionType.licenseContractCreation');
            case TransactionType.LicenseContractSigning:
                return TAPi18n.__('pendingTransactionRow.transactionType.licenseContractSigning');
            case TransactionType.LicenseContractDisabling:
                return TAPi18n.__('pendingTransactionRow.transactionType.licenseContractDisabling');
            case TransactionType.LicenseIssuing: {
                const transactionType = TAPi18n.__('pendingTransactionRow.transactionType.licenseIssuing');
                return transactionType + " (" + this.description + ", " + this.initialOwnerName + ")";
            }
            case TransactionType.IssuanceRevoke:
                return TAPi18n.__('pendingTransactionRow.transactionType.issuanceRevoke');
        }
    },
    from() {
        switch (this.transactionType) {
            case TransactionType.Transfer:
            case TransactionType.Reclaim:
                return this.from;
            case TransactionType.LicenseContractCreation:
            case TransactionType.LicenseContractSigning:
            case TransactionType.LicenseContractDisabling:
            case TransactionType.LicenseIssuing:
            case TransactionType.IssuanceRevoke:
                return this.submittedBy;
        }
    },
    to() {
        switch (this.transactionType) {
            case TransactionType.Transfer:
            case TransactionType.Reclaim:
                return this.to;
            case TransactionType.LicenseContractCreation:
            case TransactionType.LicenseContractSigning:
            case TransactionType.LicenseContractDisabling:
            case TransactionType.LicenseIssuing:
            case TransactionType.IssuanceRevoke:
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
            return TAPi18n.__('pendingTransactionRow.unconfirmed');
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
            case TransactionType.LicenseContractSigning:
                LicenseContractSigningTransactionInfo.show(this.transactionHash);
                break;
            case TransactionType.LicenseContractDisabling:
                DisableLicenseContractTransactionInfo.show(this.transactionHash);
                break;
            case TransactionType.LicenseIssuing:
                LicenseIssuingTransactionInfo.show(this.transactionHash);
                break;
            case TransactionType.IssuanceRevoke:
                IssuanceRevokeTransactionInfo.show(this.transactionHash);
                break;
        }
    }
});