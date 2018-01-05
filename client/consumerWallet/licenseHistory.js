import {lob} from "../../lib/LOB";
import {drawLicenseHistory} from "../../lib/licenseHistory";
import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

Template.licenseHistory.onRendered(function() {
    this.autorun(() => {
        const issuanceLocation = this.data.issuanceLocation;
        const canvas = Template.instance().find('#graphCanvas');

        const issuance = lob.issuances.getIssuance(issuanceLocation);
        const issuerName = lob.licenseContracts.getIssuerName(issuanceLocation.licenseContractAddress);

        lob.balances.getLicenseTransfers(issuanceLocation, (error, transfers) => {
            if (error) { handleUnknownEthereumError(error); return; }
            this.autorun(() => {
                drawLicenseHistory(canvas, transfers, issuerName, issuance.originalOwner);
            });
        });
    });
});

Template.licenseHistory.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    }
});