import { lob } from "../lib/LOB";
import { IssuanceLocation } from "../lib/IssuanceLocation";
import { handleUnknownEthereumError } from "../lib/ErrorHandling";

const reclaimOrigins = new ReactiveVar([]);
const selectedReclaimer = new ReactiveVar(undefined);
const selectedIssuanceLocation = new ReactiveVar(undefined);
const estimatedGasConsumption = new ReactiveVar(0);

Template.reclaim.onCreated(function() {
    EthAccounts.init();

    this.getValues = function() {
        const reclaimer = TemplateVar.getFrom(this.find('[name=reclaimer]'), 'value');
        const from = this.find('[name=from]').value;
        const issuanceLocation = IssuanceLocation.fromString(this.find('[name=issuance]').value);
        const amount = this.find('[name=amount]').value;
        const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
        return {reclaimer, from, issuanceLocation, amount, gasPrice};
    };

    Tracker.autorun(() => {
        let newReclaimOrigins;
        if (!selectedReclaimer.get() || !selectedIssuanceLocation.get()) {
            newReclaimOrigins = [];
        } else {
            newReclaimOrigins = lob.getReclaimOrigins(selectedIssuanceLocation.get(), selectedReclaimer.get())
                .map((address) => {
                    return {
                        issuanceLocation: selectedIssuanceLocation.get(),
                        reclaimer: selectedReclaimer.get(),
                        currentOwner: address,
                    }
                })
                .filter((obj) => {
                    return lob.getReclaimableBalanceFrom(obj.issuanceLocation, obj.reclaimer, obj.currentOwner).get() > 0;
                });
        }
        reclaimOrigins.set(newReclaimOrigins);
    });

    this.onFormUpdate = function() {
        const {issuanceLocation, reclaimer, from, amount} = this.getValues();
        selectedReclaimer.set(reclaimer);
        selectedIssuanceLocation.set(issuanceLocation);

        if (issuanceLocation) {
            lob.estimateGasReclaim(issuanceLocation, reclaimer, from, amount, (error, gasEstimate) => {
                estimatedGasConsumption.set(gasEstimate);
            });
        }

        // Validate after the DOM has updated, because changes to one input may affect the values of other inputs
        setTimeout(() => {
            this.validate();
        }, 0);
    };

    this.resetErrors = function() {
        this.$('.dapp-error').removeClass('dapp-error');
    };

    this.validate = function(errorOnEmpty = false) {
        // TODO: Show error messages

        this.resetErrors();
        let hasError = false;

        const {reclaimer, issuanceLocation, from, amount} = this.getValues();

        if (!web3.isAddress(reclaimer)) {
            // Error should already be displayed by dapp_selectAccount
            hasError = true;
        }

        if (!issuanceLocation && errorOnEmpty) {
            this.$('[name=issuanceLocation]').addClass('dapp-error');
            hasError = true;
        }

        if (issuanceLocation) {
            if (!from && errorOnEmpty) {
                this.$('[name=from]').addClass('dapp-error');
                hasError = true;
            }

            if (!web3.isAddress(from)) {
                this.$('[name=from]').addClass('dapp-error');
                hasError = true;
            }
        }

        if (lob.getReclaimableBalanceFrom(issuanceLocation, reclaimer, from).get() < amount) {
            this.$('[name=amount]').addClass('dapp-error');
            hasError = true;
        }

        return !hasError;
    };

    // Trigger a form update after everything has been created to set `reclaimer`
    setTimeout(() => this.onFormUpdate(), 0);
});

Template.reclaim.helpers({
    myAccounts() {
        return EthAccounts.find().fetch();
    },
    issuances() {
        return Array.from(lob.getIssuanceLocationsForWhichReclaimsArePossible(lob.accounts.get()))
            .map((issuanceLocation) => {
                return {
                    issuanceLocation,
                    metadata: lob.getIssuanceMetadata(issuanceLocation),
                    selected: false,
                }
            })
            .filter((obj) => {
                return lob.getReclaimableBalance(obj.issuanceLocation, selectedReclaimer.get()) > 0;
            })
    },
    reclaimOrigins() {
        return reclaimOrigins.get();
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return estimatedGasConsumption.get();
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

        lob.reclaim(issuanceLocation, reclaimer, from, amount, gasPrice, (error) => {
            if (error) { handleUnknownEthereumError(error); return; }
            // TODO: i18n
            GlobalNotification.success({
                content: 'Transaction successfully submitted',
                duration: 4
            });
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
        return this.metadata.description.get();
    },
    balance() {
        return lob.getReclaimableBalance(this.issuanceLocation, lob.accounts.get());
    },
});

Template.reclaimOriginOption.helpers({
    reclaimableBalance() {
        return lob.getReclaimableBalanceFrom(this.issuanceLocation, this.reclaimer, this.currentOwner).get();
    },
    address() {
        return this.currentOwner;
    }
});
