import {lob} from "../../lib/LOB";
import {Accounts} from "../../lib/Accounts";

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