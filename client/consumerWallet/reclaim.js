import {lob} from "../../lib/LOB";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {Accounts} from "../../lib/Accounts";
import {NotificationCenter} from "../../lib/NotificationCenter";

function getValues() {
    const reclaimer = TemplateVar.getFrom(this.find('[name=reclaimer]'), 'value').toLowerCase();
    const from = TemplateVar.getFrom(this.find('.from'), 'value').toLowerCase();
    const issuanceLocation = IssuanceLocation.fromString(this.find('[name=issuance]').value);
    const amount = this.find('[name=amount]').value;
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    return {reclaimer, from, issuanceLocation, amount, gasPrice};
}

function onFormUpdate() {
    const {issuanceLocation, reclaimer, from, amount} = this.getValues();
    this.selectedReclaimer.set(reclaimer);
    this.selectedIssuanceLocation.set(issuanceLocation);

    if (issuanceLocation) {
        lob.transfer.estimateGas.reclaim(issuanceLocation, reclaimer, from, amount, (error, gasEstimate) => {
            this.estimatedGasConsumption.set(gasEstimate);
        });
    }

    // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false) {
    this.resetErrors();

    const {reclaimer, issuanceLocation, from, amount} = this.getValues();
    let noErrors = true;

    noErrors &= validateField('reclaimer', web3.isAddress(reclaimer), true);
    noErrors &= validateField('issuance', issuanceLocation, errorOnEmpty, TAPi18n.__('reclaim.error.no_license_selected'));
    noErrors &= validateField('from', web3.isAddress(from), errorOnEmpty && from, TAPi18n.__("reclaim.error.from_not_valid"));
    noErrors &= validateField('amount', amount, errorOnEmpty, TAPi18n.__("reclaim.error.amount_not_specified"));
    if (issuanceLocation) {
        const reclaimableBalance = lob.balances.getReclaimableBalanceFrom(issuanceLocation, reclaimer, from);
        noErrors &= validateField('amount', amount <= reclaimableBalance, amount, TAPi18n.__("reclaim.error.amount_less_than_balance", reclaimableBalance));
    }
    noErrors &= validateField('amount', amount > 0, amount, TAPi18n.__("reclaim.error.amount_zero"));

    return noErrors;
}

Template.reclaim.onCreated(function() {
    this.resetErrors = resetErrors;
    this.getValues = getValues;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.reclaimOrigins = new ReactiveVar([]);
    this.selectedReclaimer = new ReactiveVar(undefined);
    this.selectedIssuanceLocation = new ReactiveVar(undefined, (oldValue, newValue) => oldValue === newValue);
    this.estimatedGasConsumption = new ReactiveVar(0);
    this.issuanceLocations = new ReactiveVar([]);
    this.computations = new Set();

    // Trigger a form update after everything has been created to set `selectedReclaimer`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.reclaim.onRendered(function() {
    const reclaimOriginsCompuation = Tracker.autorun(() => {
        const selectedReclaimer = this.selectedReclaimer.get();
        const selectedIssuanceLocation = this.selectedIssuanceLocation.get();

        let newReclaimOrigins;
        if (!selectedReclaimer || !selectedIssuanceLocation) {
            newReclaimOrigins = [];
        } else {
            newReclaimOrigins = lob.balances.getReclaimOrigins(selectedIssuanceLocation, selectedReclaimer)
                .map((address) => {
                    const reclaimableBalance = lob.balances.getReclaimableBalanceFrom(selectedIssuanceLocation, selectedReclaimer, address);
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

    const issuanceLocationsComputation = Tracker.autorun(() => {
        const issuanceLocations = lob.balances.getReclaimableIssuanceLocations(Accounts.get())
            .map((issuanceLocation) => {
                return {
                    issuanceLocation,
                    metadata: lob.issuances.getIssuance(issuanceLocation) || {},
                    selected: false,
                }
            })
            .filter((obj) => {
                return lob.balances.getReclaimableBalance(obj.issuanceLocation, this.selectedReclaimer.get()) > 0;
            })
            .sort((lhs, rhs) => {
                if (lhs.metadata.description && rhs.metadata.description) {
                    return lhs.metadata.description.localeCompare(rhs.metadata.description);
                } else {
                    return 0;
                }
            });
        this.issuanceLocations.set(issuanceLocations);

        setTimeout(() => this.onFormUpdate(), 0);
    });
    this.computations.add(issuanceLocationsComputation);
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
        return Template.instance().issuanceLocations.get();
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
        if (!Template.instance().validate(true)) {
            return;
        }

        const {reclaimer, from, issuanceLocation, amount, gasPrice} = Template.instance().getValues();

        lob.transfer.reclaim(issuanceLocation, reclaimer, from, amount, gasPrice, (error) => {
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
    issuanceLocation() {
        return this.issuanceLocation;
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
            balance += lob.balances.getReclaimableBalance(this.issuanceLocation, account);
        }
        return balance;
    },
});

Template.reclaimOriginOption.helpers({
    reclaimableBalance() {
        return lob.balances.getReclaimableBalanceFrom(this.issuanceLocation, this.reclaimer, this.currentOwner);
    },
    address() {
        return this.currentOwner;
    }
});
