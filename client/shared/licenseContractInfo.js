import {lob} from "../../lib/LOB";
import {IssuanceLocation} from "../../lib/IssuanceLocation";
import {IssuanceInfo} from "./issuanceInfo";

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
        const issuanceLocation = IssuanceLocation.fromComponents(this.licenseContract, this.issuanceID);
        IssuanceInfo.show(issuanceLocation);
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
    fee() {
        return web3.fromWei(lob.licenseContracts.getFee(this.address));
    },
    rootContract() {
        return lob.licenseContracts.getRootContract(this.address);
    },
    disabled() {
        return lob.licenseContracts.isDisabled(this.address);
    }
});

Template.licenseContractDetails.events({
    'blur .internalName'(event) {
        const name = event.target.innerText.trim();
        setTimeout(() => {
            lob.licenseContracts.setInternalName(this.address, name);
        }, 100);
    }
});