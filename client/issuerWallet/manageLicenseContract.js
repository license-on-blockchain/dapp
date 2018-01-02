import {lob} from "../../lib/LOB";
import {IssuanceInfo} from "../shared/issuanceInfo";
import {IssuanceLocation} from "../../lib/IssuanceLocation";

Template.manageLicenseContract.helpers({
    issuances() {
        return lob.issuances.getIssuancesOfLicenseContract(this.address);
    },
    contractName() {
        return lob.licenseContracts.getDisplayName(this.address);
    },
    disabled() {
        return lob.licenseContracts.isDisabled(this.address);
    }
});

Template.manageLicenseContract.events({
    'click tr.issuancesRow'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            return;
        }
        const issuanceLocation = IssuanceLocation.fromComponents(this.licenseContract, this.issuanceID);
        IssuanceInfo.show(issuanceLocation);
    },
    'click button.disableLicenseContract'(event) {
        event.preventDefault();
        Router.go('licenseContract.disable', {address: this.address});
    }
});