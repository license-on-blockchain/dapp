import {lob} from "../../lib/LOB";

Template.managedLicenseContractList.helpers({
    licenseContracts() {
        return lob.licenseContracts.getManagedLicenseContracts(lob.accounts.get()).sort((lhs, rhs) => lhs.address.localeCompare(rhs.address));
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