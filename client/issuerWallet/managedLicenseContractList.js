import {lob} from "../../lib/LOB";
import {Accounts} from "../../lib/Accounts";

Template.managedLicenseContractList.helpers({
    licenseContracts() {
        return lob.licenseContracts.getManagedLicenseContracts(Accounts.get()).sort((lhs, rhs) => lhs.address.localeCompare(rhs.address));
    }
});

Template.licenseContractRow.helpers({
    address() {
        return this.address;
    },
    signed() {
        return this.signature.get();
    }
});