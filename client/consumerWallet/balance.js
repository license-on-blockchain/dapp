import {lob} from "../../lib/LOB";
import {RootContracts} from "../../lib/RootContracts";

function getValues() {
    let address = TemplateVar.getFrom(this.find('[name=address]'), 'value');
    if (address) {
        address = address.toLowerCase();
    }

    return {address};
}

function onFormUpdate() {
    const {address} = this.getValues();

    if (web3.isAddress(address)) {
        this.address.set(address);
        lob.watchRootContractForBalances(RootContracts.getAddresses(), [address]);
    } else {
        this.address.set(null);
    }
}

Template.balance.onCreated(function() {
    this.address = new ReactiveVar(this.data.address || null);

    this.getValues = getValues;
    this.onFormUpdate = onFormUpdate;
});

Template.balance.helpers({
    address() {
        return Template.instance().address.get();
    },
    accounts() {
        return [Template.instance().address.get()];
    }
});

Template.balance.events({
    'keyup, keydown, change input'() {
        Template.instance().onFormUpdate();
    }
});