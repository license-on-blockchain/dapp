import {Accounts} from "../../lib/Accounts";
import {lob} from "../../lib/LOB";

function getName(address) {
    if (address) {
        address = address.toLowerCase();
    }
    const licenseContractName = lob.licenseContracts.getDisplayName(address);
    if (licenseContractName !== address) {
        return licenseContractName;
    }
    const accountName = Accounts.getDisplayName(address);
    if (accountName !== address) {
        return accountName;
    }
    return web3.toChecksumAddress(address);
}

Template.dapp_address.helpers({
    name() {
        return getName(this.address);
    },
    address() {
        return web3.toChecksumAddress(this.address);
    },
    italic() {
        if (this.italic === undefined) {
            return true;
        } else {
            return this.italic;
        }
    },
    showTooltip() {
        let showTooltip = true;
        if (this.showTooltip !== undefined) {
            showTooltip = this.showTooltip;
        }
        return showTooltip && getName(this.address) !== this.address;
    }
});