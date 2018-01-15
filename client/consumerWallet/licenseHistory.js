import {lob} from "../../lib/LOB";
import {drawLicenseHistory} from "../../lib/licenseHistory";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

Template.licenseHistory.onCreated(function() {
    this.error = new ReactiveVar(false);
});

Template.licenseHistory.onRendered(function() {
    this.autorun(() => {
        const issuanceLocation = this.data.issuanceLocation;
        const canvas = Template.instance().find('#graphCanvas');

        const issuance = lob.issuances.getIssuance(issuanceLocation);
        const issuerName = lob.licenseContracts.getIssuerName(issuanceLocation.licenseContractAddress);

        lob.balances.getLicenseTransfers(issuanceLocation, (error, transfers) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.autorun(() => {
                try {
                    this.error.set(false);
                    drawLicenseHistory(canvas, transfers, issuanceLocation, issuerName, issuance.originalOwner);
                } catch (error) {
                    this.error.set(true);
                    console.log(error);
                }
            });
        });
    });
});

Template.licenseHistory.helpers({
    error() {
        return Template.instance().error.get();
    }
});

Template.licenseHistory.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});