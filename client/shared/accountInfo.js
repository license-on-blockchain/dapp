import {RootContracts} from "../../lib/RootContracts";
import {Accounts} from "../../lib/Accounts";
import {lob} from "../../lib/LOB";

export const AccountInfo = {
    show(address) {
        EthElements.Modal.show({
            template: 'accountInfo',
            data: {
                address: address
            },
            class: 'mediumModal'
        });
    }
};

Template.accountInfo.onCreated(function() {
    this.computations = new Set();
    lob.watchAccountBalance(this.data.address);
});

Template.accountInfo.onRendered(function() {
    const internalNameUpdate = Tracker.autorun(() => {
        this.$('.internalName').html(Accounts.getInternalName(this.data.address));
    });
    this.computations.add(internalNameUpdate);
});

Template.accountInfo.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.accountInfo.helpers({
    address() {
        return web3.toChecksumAddress(this.address);
    },
    accounts() {
        return [this.address];
    },
});

Template.accountInfo.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
    'blur .internalName'(event) {
        const name = event.target.innerText.trim();
        Accounts.setInternalName(this.address, name);
    },
    'keypress .internalName'(event) {
        if (event.keyCode === 13) { // Enter
            event.target.blur();
        }
    },
});