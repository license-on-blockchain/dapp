import {lob} from "../../lib/LOB";

Template.manageLicenseContract.helpers({
    issuances() {
        return lob.issuances.getIssuancesOfLicenseContract(Template.instance().data.address);
    }
});