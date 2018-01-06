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
        this.loading.set(true);
        lob.watchAccountBalance(address).then(() => {
            this.loading.set(false);
        });
    } else {
        this.address.set(null);
    }
}

Template.balance.onCreated(function() {
    this.address = new ReactiveVar(this.data.address || null);
    this.loading = new ReactiveVar(false);

    this.getValues = getValues;
    this.onFormUpdate = onFormUpdate;
});

Template.balance.helpers({
    address() {
        return Template.instance().address.get();
    },
    accounts() {
        return [Template.instance().address.get()];
    },
    loading() {
        return Template.instance().loading.get();
    }
});

Template.balance.events({
    'keyup, keydown, change input'() {
        Template.instance().onFormUpdate();
    }
});