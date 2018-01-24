import {lob} from "../../lib/LOB";
import {IssuanceID} from "../../lib/IssuanceID";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {Accounts} from "../../lib/Accounts";
import {NotificationCenter} from "../../lib/NotificationCenter";

function getValues() {
    const reclaimer = TemplateVar.getFrom(this.find('[name=reclaimer]'), 'value').toLowerCase();
    const from = TemplateVar.getFrom(this.find('.from'), 'value').toLowerCase();
    const issuanceID = IssuanceID.fromString(this.find('[name=issuance]').value);
    const amount = this.find('[name=amount]').value;
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    return {reclaimer, from, issuanceID, amount, gasPrice};
}

function onFormUpdate() {
    const {issuanceID, reclaimer, from, amount} = this.getValues();
    this.selectedReclaimer.set(reclaimer);
    this.selectedIssuanceID.set(issuanceID);

    if (issuanceID) {
        lob.transfer.estimateGas.reclaim(issuanceID, reclaimer, from, amount, (error, gasEstimate) => {
            this.estimatedGasConsumption.set(gasEstimate);
        });
    }

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {reclaimer, issuanceID, from, amount} = this.getValues();
    let noErrors = true;

    noErrors &= validateField('reclaimer', web3.isAddress(reclaimer), true, null, errorMessages);
    noErrors &= validateField('issuance', issuanceID, errorOnEmpty, TAPi18n.__('reclaim.error.no_license_selected'), errorMessages);
    noErrors &= validateField('from', web3.isAddress(from), errorOnEmpty && from, TAPi18n.__("reclaim.error.from_not_valid"), errorMessages);
    noErrors &= validateField('amount', amount, errorOnEmpty, TAPi18n.__("reclaim.error.amount_not_specified"), errorMessages);
    if (issuanceID) {
        const reclaimableBalance = lob.balances.getReclaimableBalanceFrom(issuanceID, reclaimer, from);
        noErrors &= validateField('amount', amount <= reclaimableBalance, amount, TAPi18n.__("reclaim.error.amount_less_than_balance", reclaimableBalance), errorMessages);
    }
    noErrors &= validateField('amount', amount > 0, amount, TAPi18n.__("reclaim.error.amount_zero"), errorMessages);

    return noErrors;
}

Template.reclaim.onCreated(function() {
    this.resetErrors = resetErrors;
    this.getValues = getValues;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.reclaimOrigins = new ReactiveVar([]);
    this.selectedReclaimer = new ReactiveVar(undefined);
    this.selectedIssuanceID = new ReactiveVar(undefined, (oldValue, newValue) => oldValue === newValue);
    this.estimatedGasConsumption = new ReactiveVar(0);
    this.issuanceIDs = new ReactiveVar([]);
    this.computations = new Set();

    // Trigger a form update after everything has been created to set `selectedReclaimer`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.reclaim.onRendered(function() {
    const reclaimOriginsCompuation = Tracker.autorun(() => {
        const selectedReclaimer = this.selectedReclaimer.get();
        const selectedIssuanceID = this.selectedIssuanceID.get();

        let newReclaimOrigins;
        if (!selectedReclaimer || !selectedIssuanceID) {
            newReclaimOrigins = [];
        } else {
            newReclaimOrigins = lob.balances.getReclaimOrigins(selectedIssuanceID, selectedReclaimer)
                .map((address) => {
                    const reclaimableBalance = lob.balances.getReclaimableBalanceFrom(selectedIssuanceID, selectedReclaimer, address);
                    return {
                        address: address,
                        name: address + ' – ' + reclaimableBalance + " " + TAPi18n.__("generic.license", {count: reclaimableBalance}),
                        selected: false,
                        reclaimableBalance: reclaimableBalance
                    }
                })
                .filter((obj) => {
                    return obj.reclaimableBalance > 0;
                });
        }
        this.reclaimOrigins.set(newReclaimOrigins);

        setTimeout(() => this.onFormUpdate(), 0);
    });
    this.computations.add(reclaimOriginsCompuation);

    const issuanceIDsComputation = Tracker.autorun(() => {
        let selectedLicenseContract = this.data.licenseContract;
        if (selectedLicenseContract) {
            selectedLicenseContract = selectedLicenseContract.toLowerCase();
        }
        let selectedIssuanceID = Number(this.data.issuanceNumber);

        const issuanceIDs = lob.balances.getReclaimableIssuanceIDs(Accounts.get())
            .map((issuanceID) => {
                return {
                    issuanceID,
                    metadata: lob.issuances.getIssuance(issuanceID) || {},
                    selected: (issuanceID.licenseContractAddress.toLowerCase() === selectedLicenseContract && issuanceID.issuanceNumber === selectedIssuanceID),
                }
            })
            .filter((obj) => {
                return lob.balances.getReclaimableBalance(obj.issuanceID, this.selectedReclaimer.get()) > 0;
            })
            .sort((lhs, rhs) => {
                if (lhs.metadata.description && rhs.metadata.description) {
                    return lhs.metadata.description.localeCompare(rhs.metadata.description);
                } else {
                    return 0;
                }
            });
        this.issuanceIDs.set(issuanceIDs);

        setTimeout(() => this.onFormUpdate(), 0);
    });
    this.computations.add(issuanceIDsComputation);
});

Template.reclaim.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.reclaim.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    issuances() {
        return Template.instance().issuanceIDs.get();
    },
    reclaimOrigins() {
        return Template.instance().reclaimOrigins.get();
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    }
});

Template.reclaim.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click button#reclaim'(event) {
        event.preventDefault();
        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {reclaimer, from, issuanceID, amount, gasPrice} = Template.instance().getValues();

        lob.transfer.reclaim(issuanceID, reclaimer, from, amount, gasPrice, (error) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            NotificationCenter.showTransactionSubmitted();
        });
        Router.go('licenses');
    }
});

Template.reclaimIssuanceOption.helpers({
    issuanceID() {
        return this.issuanceID;
    },
    preselected() {
        return this.selected ? 'selected' : '';
    },
    description() {
        return this.metadata.description;
    },
    balance() {
        let balance = 0;
        for (const account of Accounts.get()) {
            balance += lob.balances.getReclaimableBalance(this.issuanceID, account);
        }
        return balance;
    },
});

Template.reclaimOriginOption.helpers({
    reclaimableBalance() {
        return lob.balances.getReclaimableBalanceFrom(this.issuanceID, this.reclaimer, this.currentOwner);
    },
    address() {
        return this.currentOwner;
    }
});
