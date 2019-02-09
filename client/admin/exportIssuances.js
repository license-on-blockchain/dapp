const licenseContracts = new ReactiveVar([]);
const issuancesJson = new ReactiveVar('');

Template.exportIssuances.onRendered(function() {
    lob.rootContracts.getAddresses().then((rootContracts) => {
        return lob.rootContracts.getLicenseContracts(rootContracts);
    }).then((lc) => {
        licenseContracts.set(lc);
    });
    Tracker.autorun(() => {
        let allIssuances = [];
        for (const licenseContract of licenseContracts.get()) {
            const issuances = lob.issuances.getIssuancesOfLicenseContract(licenseContract);
            allIssuances = allIssuances.concat(issuances.map((issuance) => {
                return {
                    description: issuance.description,
                    code: issuance.code,
                    licenseContract: issuance.licenseContract,
                    issuanceNumber: issuance.issuanceNumber,
                }
            }));
        }
        issuancesJson.set(JSON.stringify(allIssuances, null, 2));
    });
});

Template.exportIssuances.helpers({
    issuancesJson() {
        return issuancesJson.get();
    }
});
