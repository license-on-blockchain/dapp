import {lob} from "../../lib/LOB";
import {resetErrors, validateField} from "../../lib/FormHelpers";
import {licenseTemplates} from "../../lib/licenseTemplates";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";
import {NotificationCenter} from "../../lib/NotificationCenter";
import {Accounts} from "../../lib/Accounts";

function getValues() {
    const licenseContractAddress = TemplateVar.getFrom(this.find('.licenseContract'), 'value').toLowerCase();
    const licenseTemplateCode = this.find('[name=licenseTemplate]').value;
    const code = this.find('[name=code]').value;
    const description = this.find('[name=description]').value;
    const amount = this.find('[name=amount]').value;
    let auditTime = new Date(this.find('[name=auditTime]').value);
    if (isNaN(auditTime.getTime())) {
        auditTime = null;
    }
    const auditRemark = this.find('[name=auditRemark]').value;
    const initialOwnerAddress = this.find('[name=initialOwnerAddress]').value.toLowerCase();
    const initialOwnerName = this.find('[name=initialOwnerName]').value;
    const gasPrice = TemplateVar.getFrom(this.find('.dapp-select-gas-price'), 'gasPrice');
    return {licenseContractAddress, licenseTemplateCode, code, description, amount, auditTime, auditRemark, initialOwnerAddress, initialOwnerName, gasPrice};
}

function onFormUpdate() {
    let {licenseContractAddress, licenseTemplateCode, code, description, amount, auditTime, auditRemark, initialOwnerAddress, initialOwnerName} = this.getValues();

    if (licenseTemplateCode === "") {
        licenseTemplateCode = null;
    }
    this.selectedTemplateCode.set(licenseTemplateCode);

    this.selectedLicenseContract.set(licenseContractAddress);

    if (licenseContractAddress) {
        const auditTimestamp = (auditTime || new Date()).getTime() / 1000;
        const from = lob.licenseContracts.getIssuerAddress(licenseContractAddress);
        const fee = lob.licenseContracts.getFee(licenseContractAddress);
        lob.licenseIssuing.estimateGas.issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTimestamp, from, fee, (error, value) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.estimatedGasConsumption.set(value);
        });
    }

    setTimeout(() => this.validate(), 0);
}

function validate(errorOnEmpty = false) {
    this.resetErrors();

    let noErrors = true;

    let {licenseContractAddress, code, description, amount, auditTime, auditRemark, initialOwnerAddress, initialOwnerName} = this.getValues();


    noErrors &= validateField('licenseContract', web3.isAddress(licenseContractAddress), errorOnEmpty, TAPi18n.__('issueLicense.error.licenseContract_not_valid'));
    noErrors &= validateField('code', code, errorOnEmpty, TAPi18n.__('issueLicense.error.code_empty'));
    noErrors &= validateField('description', description, errorOnEmpty, TAPi18n.__('issueLicense.error.description_empty'));
    noErrors &= validateField('amount', amount, errorOnEmpty, TAPi18n.__('issueLicense.error.amount_empty'));
    noErrors &= validateField('amount', amount > 0, amount, TAPi18n.__('issueLicense.error.amount_zero'));
    noErrors &= validateField('auditTime', auditTime, errorOnEmpty, TAPi18n.__('issueLicense.error.auditTime_empty'));
    noErrors &= validateField('auditTime', auditTime <= new Date(), auditTime, TAPi18n.__('issueLicense.error.auditTime_in_future'));
    noErrors &= validateField('initialOwnerAddress', web3.isAddress(initialOwnerAddress), errorOnEmpty, TAPi18n.__('issueLicense.error.initialOwnerAddress_not_valid'));
    noErrors &= validateField('initialOwnerName', initialOwnerName, errorOnEmpty, TAPi18n.__('issueLicense.error.initialOwnerName_empty'));
    noErrors &= validateField('fee', this.selectedLicenseContract.get() && lob.licenseContracts.getFee(this.selectedLicenseContract.get()) !== null, errorOnEmpty, TAPi18n.__('issueLicense.error.fee_not_fetched'));
    noErrors &= validateField('gasEstimate', this.estimatedGasConsumption.get() !== 0, noErrors, TAPi18n.__('generic.transactionWillFail'));

    return noErrors;
}

Template.issueLicense.onCreated(function() {
    this.computations = new Set();

    this.licenseContracts = new ReactiveVar([]);
    this.selectedLicenseContract = new ReactiveVar(undefined);
    this.selectedTemplateCode = new ReactiveVar(null);
    this.estimatedGasConsumption = new ReactiveVar(null);

    this.getValues = getValues;
    this.resetErrors = resetErrors;
    this.onFormUpdate = onFormUpdate;
    this.validate = validate;
});

Template.issueLicense.onRendered(function() {
    const licenseContractsComputation = Tracker.autorun(() => {
        let licenseContracts = lob.licenseContracts.getManagedLicenseContracts(Accounts.get());
        // Don't show license contracts that are not signed yet
        licenseContracts = licenseContracts.filter((licenseContract) => {
            return lob.licenseContracts.isSigned(licenseContract) && !lob.licenseContracts.isDisabled(licenseContract);
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

Template.issueLicense.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.issueLicense.helpers({
    licenseContracts() {
        let preselectedLicenseContract = undefined;
        if (Template.instance().data) {
            preselectedLicenseContract = Template.instance().data.licenseContractAddress
        }
        if (preselectedLicenseContract) {
            preselectedLicenseContract = preselectedLicenseContract.toLowerCase();
        }
        return Template.instance().licenseContracts.get().map((licenseContract) => {
            return {
                address: licenseContract,
                selected: licenseContract.toLowerCase() === preselectedLicenseContract
            }
        });
    },
    licenseTemplates() {
        const licenseTemplatesByManufacturer = {};
        for (const [code, template] of Object.entries(licenseTemplates)) {
            if (typeof licenseTemplatesByManufacturer[template.manufacturer] === 'undefined') {
                licenseTemplatesByManufacturer[template.manufacturer] = {};
            }
            licenseTemplatesByManufacturer[template.manufacturer][code] = template.description;
        }
        return Object.entries(licenseTemplatesByManufacturer).map(([name, templatesDict]) => {
            const templates = Object.entries(templatesDict).map(([code, description]) => {
                return {code, description};
            }).sort((lhs, rhs) => lhs.description.localeCompare(rhs.description));
            return {name, templates};
        }).sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
    },
    templateLicenseCode() {
        return Template.instance().selectedTemplateCode.get();
    },
    templateLicenseDescription() {
        const code = Template.instance().selectedTemplateCode.get();
        if (code) {
            return licenseTemplates[code].manufacturer + " " + licenseTemplates[code].description;
        } else {
            return null;
        }
    },
    codeAndDescriptionReadonly() {
        return Template.instance().selectedTemplateCode.get() ? "readonly" : "";
    },
    fee() {
        const selectedLicenseContract = Template.instance().selectedLicenseContract.get();
        if (selectedLicenseContract) {
            return web3.fromWei(lob.licenseContracts.getFee(selectedLicenseContract));
        } else {
            return "…";
        }
    },
    gasPrice() {
        return EthBlocks.latest.gasPrice;
    },
    gasEstimate() {
        return Template.instance().estimatedGasConsumption.get();
    }
});

Template.issueLicense.events({
    'keyup, change input'() {
        Template.instance().onFormUpdate();
    },
    'change select'() {
        Template.instance().onFormUpdate();
    },
    'click button#issueLicense'(event) {
        event.preventDefault();

        if (!Template.instance().validate(true)) {
            return;
        }

        const {licenseContractAddress, code, description, amount, auditTime, auditRemark, initialOwnerAddress, initialOwnerName, gasPrice} = Template.instance().getValues();

        const auditTimestamp = (auditTime || new Date()).getTime() / 1000;
        const from = lob.licenseContracts.getIssuerAddress(licenseContractAddress);
        const fee = lob.licenseContracts.getFee(licenseContractAddress);

        lob.licenseIssuing.issueLicense(licenseContractAddress, description, code, amount, initialOwnerAddress, initialOwnerName, auditRemark, auditTimestamp, from, fee, gasPrice, (error) => {
            if (error) {
                NotificationCenter.showError(error);
                return;
            }
            NotificationCenter.showTransactionSubmitted();
        });
    }
});
