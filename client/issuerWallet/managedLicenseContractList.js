import {lob} from "../../lib/LOB";
import {Accounts} from "../../lib/Accounts";
import {LicenseContractInfo} from "../shared/licenseContractInfo";

Template.managedLicenseContractList.helpers({
    licenseContracts() {
        return lob.licenseContracts.getManagedLicenseContracts(Accounts.get())
            .sort()
            .map((licenseContract) => {
                return {
                    address: licenseContract
                }
            });
    }
});

Template.licenseContractRow.helpers({
    address() {
        return this.address;
    },
    signed() {
        return lob.licenseContracts.getSignature(this.address);
    }
});

Template.licenseContractRow.events({
    'click tr'(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
            // Don't show license contract info if a button link was clicked
            return;
        }
        LicenseContractInfo.show(this.address);
    }
});