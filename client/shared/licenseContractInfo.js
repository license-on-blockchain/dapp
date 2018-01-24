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
    internalName() {
        return lob.licenseContracts.getInternalName(this.address);
    },
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
        // Allow some time for the focus to leave the field. Otherwise the text sometimes duplicates
        setTimeout(() => {
            lob.licenseContracts.setInternalName(this.address, name);
        }, 100);
    },
    'click .showIssuerAccountInfo'() {
        const issuerAddress = lob.licenseContracts.getIssuerAddress(this.address);
        AccountInfo.show(issuerAddress);
    }
});