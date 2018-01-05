import {RootContracts} from "../../lib/RootContracts";
import {Accounts} from "../../lib/Accounts";

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
    lob.watchRootContractForBalances(RootContracts.getAddresses(), [this.data.address]);
});

Template.accountInfo.helpers({
    address() {
        return this.address;
    },
    internalName() {
        return Accounts.getInternalName(this.address);
    },
    accounts() {
        return [this.address];
    },
});

Template.accountInfo.events({
    'blur .internalName'(event) {
        debugger;
        const name = event.target.innerText.trim();
        setTimeout(() => {
            Accounts.setInternalName(this.address, name);
        }, 100);
    }
});