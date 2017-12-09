import { lob } from "../../lib/LOB";

Template.managedLicenseContractList.helpers({
    licenseContracts() {
        return lob.getManagedLicenseContracts(lob.accounts.get());
    }
});

Template.licenseContractRow.helpers({
    address() {
        return this.address;
    }
});