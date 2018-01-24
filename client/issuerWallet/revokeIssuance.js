import {lob} from "../../lib/LOB";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {Accounts} from "../../lib/Accounts";

function getValues() {
    let licenseContract = TemplateVar.getFrom(this.find('.licenseContract'), 'value').toLowerCase();
    if (licenseContract === '') {
        licenseContract = null;
    }
    const issuanceNumber = this.find('[name=issuance]').value;
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');

    return {licenseContract, issuanceNumber, gasPrice};
}

function onFormUpdate() {
    const {licenseContract, issuanceNumber} = this.getValues();

    this.selectedLicenseContract.set(licenseContract);

    if (licenseContract) {
        const issuerAddress = lob.licenseContracts.getIssuerAddress(licenseContract);
        lob.licenseIssuing.estimateGas.revokeIssuance(licenseContract, issuanceNumber, issuerAddress, (error, gasConsumption) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.estimatedGasConsumption.set(gasConsumption);
        });
    }

    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {licenseContract, issuanceNumber} = this.getValues();

    let noErrors = true;

    noErrors &= validateField('licenseContract', licenseContract, errorOnEmpty, TAPi18n.__('revokeIssuance.error.no_licenseContract_selected'), errorMessages);
    noErrors &= validateField('issuance', issuanceNumber, errorOnEmpty, TAPi18n.__('revokeIssuance.error.no_issuance_selected'), errorMessages);
    noErrors &= validateField('gasEstimate', this.estimatedGasConsumption.get() !== 0, noErrors, TAPi18n.__('generic.transactionWillFail'), errorMessages);

    return noErrors;
}

Template.revokeIssuance.onCreated(function() {
    this.computations = new Set();

    this.licenseContracts = new ReactiveVar([]);
    this.selectedLicenseContract = new ReactiveVar(null);
    this.estimatedGasConsumption = new ReactiveVar(null);

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.revokeIssuance.onRendered(function() {
    const licenseContractsComputation = Tracker.autorun(() => {
        this.licenseContracts.set(lob.licenseContracts.getManagedLicenseContracts(Accounts.get()));
        setTimeout(() => this.onFormUpdate(), 0);
    });
    this.computations.add(licenseContractsComputation);

    const validateGasEstimate = Tracker.autorun(() => {
        // Trigger a form validation when the estimatedGasConsumption changes
        this.estimatedGasConsumption.get();
        this.validate();
    });
    this.computations.add(validateGasEstimate);
});

Template.revokeIssuance.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.revokeIssuance.helpers({
    licenseContracts() {
        return Template.instance().licenseContracts.get()
            .sort()
            .map((licenseContract) => {
                return {
                    address: licenseContract,
                    selected: Template.instance().data.licenseContract === licenseContract
                }
            });
    },

    issuances() {
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();
        const preselectedIssuanceID = Template.instance().data.issuanceNumber;
        if (selectedLicenseContract === null) {
            return [];
        }
        return lob.issuances.getIssuancesOfLicenseContract(selectedLicenseContract, /*onlyNonRevoked*/true)
            .map((issuance) => {
                return {
                    licenseContract: issuance.licenseContract,
                    issuanceNumber: issuance.issuanceNumber,
                    description: issuance.description,
                    selected: issuance.issuanceNumber === Number(preselectedIssuanceID),
                }
            })
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    },
});

Template.revokeIssuance.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click button#revoke'(event) {
        event.preventDefault();

        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {licenseContract, issuanceNumber, gasPrice} = Template.instance().getValues();
        const issuerAddress = lob.licenseContracts.getIssuerAddress(licenseContract);

        lob.licenseIssuing.revokeIssuance(licenseContract, issuanceNumber, issuerAddress, gasPrice, (error) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            NotificationCenter.showTransactionSubmitted();
            Router.go('manageLicenseContract', {address: licenseContract});
        })
    }
});

Template.issuanceRevokeOption.helpers({
    preselected() {
        return this.selected ? 'selected' : '';
    }
});