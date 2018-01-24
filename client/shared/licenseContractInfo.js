import {lob} from "../../lib/LOB";
import {IssuanceID} from "../../lib/IssuanceID";
import {IssuanceInfo} from "./issuanceInfo";
import {AccountInfo} from "./accountInfo";

export const LicenseContractInfo = {
    show(licenseContractAddress) {
        EthElements.Modal.show({
            template: 'licenseContractInfo',
            data: {
                address: licenseContractAddress
            },
            class: 'mediumModal'
        });
    }
};

Template.licenseContractInfo.onCreated(function() {
    this.computations = new Set();
});

Template.licenseContractInfo.onRendered(function() {
    const internalNameUpdate = Tracker.autorun(() => {
        this.$('.internalName').html(lob.licenseContracts.getInternalName(this.data.address));
    });
    this.computations.add(internalNameUpdate);
});

Template.licenseContractInfo.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.licenseContractInfo.helpers({
    address() {
        return this.address;
    },
    certificateValidationError() {
        return lob.licenseContracts.getSignatureValidationError(this.address);
    },
    certificateText() {
        const certificateText = lob.licenseContracts.getCertificateText(this.address);
        if (certificateText) {
            return certificateText.split('\n');
        } else {
            return certificateText;
        }
    },
    issuances() {
        return lob.issuances.getIssuancesOfLicenseContract(this.address);
    }
});

Template.licenseContractInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
    'click a.showIssuanceInfo'() {
        const issuanceID = IssuanceID.fromComponents(this.licenseContract, this.issuanceNumber);
        IssuanceInfo.show(issuanceID);
    }
});

Template.licenseContractDetails.helpers({
    issuerName() {
        return lob.licenseContracts.getIssuerName(this.address);
    },
    issuerAddress() {
        return lob.licenseContracts.getIssuerAddress(this.address);
    },
    signed() {
        return lob.licenseContracts.isSigned(this.address);
    },
    issuanceFee() {
        return web3.fromWei(lob.licenseContracts.getIssuanceFee(this.address));
    },
    rootContract() {
        return lob.licenseContracts.getRootContract(this.address);
    },
    disabled() {
        return lob.licenseContracts.isDisabled(this.address);
    },
    managerAddress() {
        return lob.licenseContracts.getManagerAddress(this.address);
    }
});

Template.licenseContractDetails.events({
    'blur .internalName'(event) {
        const name = event.target.innerText.trim();
        lob.licenseContracts.setInternalName(this.address, name);
    },
    'keypress .internalName'(event) {
        if (event.keyCode === 13) { // Enter
            event.target.blur();
        }
    },
    'click .showIssuerAccountInfo'() {
        const issuerAddress = lob.licenseContracts.getIssuerAddress(this.address);
        AccountInfo.show(issuerAddress);
    }
});