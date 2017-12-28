import { lob } from "../../lib/LOB";
import { IssuanceLocation } from "../../lib/IssuanceLocation";
import { handleUnknownEthereumError } from "../../lib/ErrorHandling";
import { resetErrors, validateField } from "../../lib/FormHelpers";

function getValues() {
    const reclaimer = TemplateVar.getFrom(this.find('[name=reclaimer]'), 'value');
    const from = this.find('[name=from]').value;
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
    const reclaimableBalance = lob.balances.getOpenReclaims(reclaimer).getReclaimableBalanceFrom(issuanceLocation, from);
    noErrors &= validateField('amount', amount <= reclaimableBalance, amount, TAPi18n.__("reclaim.error.amount_less_than_balance", reclaimableBalance));
    noErrors &= validateField('amount', amount > 0, amount, TAPi18n.__("reclaim.error.amount_zero"));

    return noErrors;
}

Template.reclaim.onCreated(function() {
    EthAccounts.init();

    this.resetErrors = resetErrors;
    this.getValues = getValues;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;

    this.reclaimOrigins = new ReactiveVar([]);
    this.selectedReclaimer = new ReactiveVar(undefined);
    this.selectedIssuanceLocation = new ReactiveVar(undefined, (oldValue, newValue) => oldValue === newValue);
    this.estimatedGasConsumption = new ReactiveVar(0);
    this.issuanceLocations = new ReactiveVar([]);

    // Trigger a form update after everything has been created to set `selectedReclaimer`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.reclaim.onRendered(function() {
    Tracker.autorun(() => {
        const selectedReclaimer = this.selectedReclaimer.get();
        const selectedIssuanceLocation = this.selectedIssuanceLocation.get();

        let newReclaimOrigins;
        if (!selectedReclaimer || !selectedIssuanceLocation) {
            newReclaimOrigins = [];
        } else {
            newReclaimOrigins = lob.balances.getOpenReclaims(selectedReclaimer).getReclaimOrigins(selectedIssuanceLocation)
                .map((address) => {
                    return {
                        issuanceLocation: selectedIssuanceLocation,
                        reclaimer: selectedReclaimer,
                        currentOwner: address,
                    }
                })
                .filter((obj) => {
                    return lob.balances.getOpenReclaims(obj.reclaimer).getReclaimableBalanceFrom(obj.issuanceLocation, obj.currentOwner) > 0;
                });
        }
        this.reclaimOrigins.set(newReclaimOrigins);

        setTimeout(() => this.onFormUpdate(), 0);
    });

    Tracker.autorun(() => {
        const issuanceLocationsSet = new Set();

        for (const address of lob.accounts.get()) {
            const merge = lob.balances.getOpenReclaims(address).getReclaimableIssuanceLocations();
            for (const issuanceLocation of merge) {
                issuanceLocationsSet.add(issuanceLocation);
            }
        }
        const issuanceLocations = Array.from(issuanceLocationsSet)
            .map((issuanceLocation) => {
                return {
                    issuanceLocation,
                    metadata: lob.issuances.getIssuance(issuanceLocation),
                    selected: false,
                }
            })
            .filter((obj) => {
                return lob.balances.getOpenReclaims(this.selectedReclaimer.get()).getReclaimableBalance(obj.issuanceLocation) > 0;
            });
        this.issuanceLocations.set(issuanceLocations);

        setTimeout(() => this.onFormUpdate(), 0);
    });
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
        for (const account of lob.accounts.get()) {
            balance += lob.balances.getOpenReclaims(account).getReclaimableBalance(this.issuanceLocation);
        }
        return balance;
    },
});

Template.reclaimOriginOption.helpers({
    reclaimableBalance() {
        return lob.balances.getOpenReclaims(this.reclaimer).getReclaimableBalanceFrom(this.issuanceLocation, this.currentOwner);
    },
    address() {
        return this.currentOwner;
    }
});
