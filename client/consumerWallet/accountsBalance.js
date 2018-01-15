import {Accounts} from "../../lib/Accounts";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {lob} from "../../lib/LOB";

function getLicenseRows(accounts, revoked, actionsEnabled) {
    const issuanceLocations = lob.balances.getNonZeroBalanceIssuanceLocations(accounts)
        .concat(lob.balances.getReclaimableIssuanceLocations(accounts));

    return Array.from(new Set(issuanceLocations))
        .map((issuanceLocation) => {
            return {
                issuanceLocation: issuanceLocation,
                metadata: lob.issuances.getIssuance(issuanceLocation) || {},
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
        return lob.balances.getOwnedBalance(this.issuanceLocation, this.accounts);
    },
    extendedBalanceInfo() {
        return lob.balances.getBorrowedBalance(this.issuanceLocation, this.accounts) > 0 ||
            lob.balances.getReclaimableBalance(this.issuanceLocation, this.accounts) > 0;
    },
    borrowedBalance() {
        return lob.balances.getBorrowedBalance(this.issuanceLocation, this.accounts);
    },
    reclaimableBalance() {
        return lob.balances.getReclaimableBalance(this.issuanceLocation, this.accounts);
    },
    maxBalanceAddress() {
        return Accounts.get()
            .map((account) => {
                return [account, lob.balances.getOwnedBalance(this.issuanceLocation, account)];
            })
            .reduce(([lhsAddress, lhsBalance], [rhsAddress, rhsBalance]) => {
                return lhsBalance > rhsBalance ? [lhsAddress, lhsBalance] : [rhsAddress, rhsBalance];
            }, [undefined, -1])[0];
    },
    maxReclaimableBalanceAddress() {
        return Accounts.get()
            .map((account) => {
                return [account, lob.balances.getReclaimableBalance(this.issuanceLocation, account)];
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
        return !this.metadata.revoked && lob.balances.getOwnedBalance(this.issuanceLocation, this.accounts) > 0;
    },
    reclaimPossible() {
        return !this.metadata.revoked && lob.balances.getReclaimableBalance(this.issuanceLocation, this.accounts) > 0;
    },
    licenseContract() {
        return this.metadata.licenseContract;
    },
    issuanceID() {
        return this.metadata.issuanceID;
    },
    signatureValidationError() {
        return lob.licenseContracts.getSignatureValidationError(this.issuanceLocation.licenseContractAddress);
    }
});

Template.licenseRow.events({
    'click a.showCertificate'() {
        EthElements.Modal.show({
            template: 'licenseCertificate',
            data: {
                issuanceLocation: Template.instance().data.issuanceLocation,
            },
            class: 'wideModal'
        });
    },
    'click a.showHistory'() {
        EthElements.Modal.show({
            template: 'licenseHistory',
            data: {
                issuanceLocation: Template.instance().data.issuanceLocation,
            },
            class: 'wideModal'
        });
    },
    'click tr'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            // Don't show issuance info if a button link was clicked
            return;
        }
        IssuanceInfo.show(Template.instance().data.issuanceLocation);
    },
});