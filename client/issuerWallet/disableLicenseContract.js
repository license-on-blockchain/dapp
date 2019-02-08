import {resetErrors, validateField} from "../../lib/FormHelpers";
import {lob} from "../../lib/LOB";
import {Accounts} from "../../lib/Accounts";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {NotificationCenter} from "../../lib/NotificationCenter";

function getValues() {
    const licenseContract = TemplateVar.getFrom(this.find('.licenseContract'), 'value');
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    const warningChecked = this.find('[name=warning]').checked;
    return {licenseContract, gasPrice, warningChecked};
}

function onFormUpdate() {
    const {licenseContract} = this.getValues();

    if (licenseContract) {
        const issuerAddress = lob.licenseContracts.getIssuerAddress(licenseContract);
        lob.licenseIssuing.estimateGas.disableLicenseContract(licenseContract, issuerAddress, (error, gasConsumption) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.estimatedGasConsumption.set(gasConsumption);
        })
    }

    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false, errorMessages = []) {
    this.resetErrors();

    const {licenseContract, warningChecked} = this.getValues();

    let noErrors = true;

    noErrors &= validateField('licenseContract', web3.utils.isAddress(licenseContract), true, null, errorMessages);
    noErrors &= validateField('warning', warningChecked, errorOnEmpty, TAPi18n.__('disableLicenseContract.error.warning_not_checked'), errorMessages);
    noErrors &= validateField('gasEstimate', this.estimatedGasConsumption.get() !== 0, noErrors, TAPi18n.__('generic.transactionWillFail'), errorMessages);

    return noErrors;
}

Template.disableLicenseContract.onCreated(function() {
    this.computations = new Set();

    this.licenseContracts = new ReactiveVar([]);
    this.estimatedGasConsumption = new ReactiveVar(null);

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.disableLicenseContract.onRendered(function() {
    const licenseContractsComputation = Tracker.autorun(() => {
        let licenseContracts = lob.licenseContracts.getManagedLicenseContracts(Accounts.get());
        // Don't show license contracts that are already signed
        licenseContracts = licenseContracts.filter((licenseContract) => {
            return !lob.licenseContracts.isDisabled(licenseContract);
        });
        this.licenseContracts.set(licenseContracts);
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

Template.disableLicenseContract.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.disableLicenseContract.helpers({
    licenseContracts() {
        let preselectedLicenseContract = Template.instance().data.address;
        if (preselectedLicenseContract) {
            preselectedLicenseContract = preselectedLicenseContract.toLowerCase();
        }
        return Template.instance().licenseContracts.get()
            .map((licenseContract) => {
                return {
                    address: licenseContract,
                    selected: licenseContract.toLowerCase() === preselectedLicenseContract
                }
            })
            .sort((lhs, rhs) => lhs.address.localeCompare(rhs.address));
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    },
});

Template.disableLicenseContract.events({
    'click button#disable'(event) {
        event.preventDefault();
        const errorMessages = [];
        if (!Template.instance().validate(true, errorMessages)) {
            for (const errorMessage of errorMessages) {
                NotificationCenter.showError(errorMessage);
            }
            return;
        }

        const {licenseContract, gasPrice} = Template.instance().getValues();

        const issuerAddress = lob.licenseContracts.getIssuerAddress(licenseContract);
        lob.licenseIssuing.disableLicenseContract(licenseContract, issuerAddress, gasPrice, (error, transactionHash) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            NotificationCenter.showTransactionSubmitted();
            Router.go('licensecontracts');
        })
    }
});
