import {Accounts} from "../../lib/Accounts";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {lob} from "../../lib/LOB";

function getLicenseRows(accounts, revoked, actionsEnabled) {
    const issuanceIDs = lob.balances.getNonZeroBalanceIssuanceIDs(accounts)
        .concat(lob.balances.getReclaimableIssuanceIDs(accounts));

    return Array.from(new Set(issuanceIDs))
        .map((issuanceID) => {
            return {
                issuanceID: issuanceID,
                metadata: lob.issuances.getIssuance(issuanceID) || {},
                accounts: accounts,
                actionsEnabled: actionsEnabled
            };
        })
        .filter((obj) => obj.metadata.revoked === revoked)
        .sort((lhs, rhs) => {
            return lhs.metadata.description.localeCompare(rhs.metadata.description);
        });
}

Template.accountsBalance.helpers({
    licenses() {
        return getLicenseRows(this.accounts, /*revoked*/false, this.actionsEnabled);
    },
    revokedLicenses() {
        return getLicenseRows(this.accounts, /*revoked*/true, this.actionsEnabled);
    },
    ownedAccounts() {
        return this.ownedAccounts;
    }
});

Template.licenseRow.helpers({
    revoked() {
        if (typeof this.revoked === 'undefined') {
            return false;
        }
        return this.revoked;
    },
    balance() {
        return lob.balances.getProperBalance(this.issuanceID, this.accounts);
    },
    extendedBalanceInfo() {
        return lob.balances.getTemporaryBalance(this.issuanceID, this.accounts) > 0 ||
            lob.balances.getReclaimableBalance(this.issuanceID, this.accounts) > 0;
    },
    temporaryBalance() {
        return lob.balances.getTemporaryBalance(this.issuanceID, this.accounts);
    },
    reclaimableBalance() {
        return lob.balances.getReclaimableBalance(this.issuanceID, this.accounts);
    },
    maxBalanceAddress() {
        return Accounts.get()
            .map((account) => {
                return [account, lob.balances.getProperBalance(this.issuanceID, account)];
            })
            .reduce(([lhsAddress, lhsBalance], [rhsAddress, rhsBalance]) => {
                return lhsBalance > rhsBalance ? [lhsAddress, lhsBalance] : [rhsAddress, rhsBalance];
            }, [undefined, -1])[0];
    },
    maxReclaimableBalanceAddress() {
        return Accounts.get()
            .map((account) => {
                return [account, lob.balances.getReclaimableBalance(this.issuanceID, account)];
            })
            .reduce(([lhsAddress, lhsBalance], [rhsAddress, rhsBalance]) => {
                return lhsBalance > rhsBalance ? [lhsAddress, lhsBalance] : [rhsAddress, rhsBalance];
            }, [undefined, -1])[0];
    },
    description() {
        return this.metadata.description;
    },
    actionsEnabled() {
        return this.actionsEnabled;
    },
    transferPossible() {
        return !this.metadata.revoked && lob.balances.getProperBalance(this.issuanceID, this.accounts) > 0;
    },
    reclaimPossible() {
        return !this.metadata.revoked && lob.balances.getReclaimableBalance(this.issuanceID, this.accounts) > 0;
    },
    licenseContract() {
        return this.metadata.licenseContract;
    },
    issuanceNumber() {
        return this.metadata.issuanceNumber;
    },
    signatureValidationError() {
        return lob.licenseContracts.getSignatureValidationError(this.issuanceID.licenseContractAddress);
    }
});

Template.licenseRow.events({
    'click a.showCertificate'() {
        EthElements.Modal.show({
            template: 'licenseCertificate',
            data: {
                issuanceID: Template.instance().data.issuanceID,
            },
            class: 'wideModal'
        });
    },
    'click a.showHistory'() {
        EthElements.Modal.show({
            template: 'licenseHistory',
            data: {
                issuanceID: Template.instance().data.issuanceID,
            },
            class: 'wideModal'
        });
    },
    'click tr'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            // Don't show issuance info if a button link was clicked
            return;
        }
        IssuanceInfo.show(Template.instance().data.issuanceID);
    },
});