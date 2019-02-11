const licenseContracts = new ReactiveVar([]);
const issuancesJson = new ReactiveVar('');
const network = new ReactiveVar(null);

Template.exportIssuances.onRendered(function() {
    lob.rootContracts.getAddresses().then((rootContracts) => {
        return lob.rootContracts.getLicenseContracts(rootContracts);
    }).then((lc) => {
        licenseContracts.set(lc);
    });

    web3.version.getNetwork((error, value) => {
        network.set(Number(value));
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
                    network: network.get(),
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
