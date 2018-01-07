import {Accounts} from "../../lib/Accounts";
import {lob} from "../../lib/LOB";

Template.selectAddress.onCreated(function() {
    if (!TemplateVar.get('value')) {
        TemplateVar.set('value', '');
    }
    this.update = function() {
        if (this.view.isRendered) {
            const address = this.find('select').value;
            TemplateVar.set(this, 'value', address);
        }
    };
});

Template.selectAddress.onRendered(function() {
    setTimeout(() => this.update(), 0);
});

Template.selectAddress.helpers({
    addresses() {
        // Update whenever the addresses change
        // This is actually a pretty awful hack, but I haven't found a better way to listen to changes of this.addresses
        const template = Template.instance();
        setTimeout(() => template.update(), 0);
        return this.addresses;
    },
    selectedAddress() {
        return TemplateVar.get('value');
    },
    class() {
        return this.class;
    }
});

Template.selectAddress.events({
    'change select'() {
        Template.instance().update();
    }
});

Template.selectAddressOption.helpers({
    preselected() {
        return this.selected ? 'selected' : '';
    },
    name() {
        if (this.name) {
            return this.name;
        } else {
            const licenseContractName = lob.licenseContracts.getDisplayName(this.address);
            if (licenseContractName !== this.address) {
                return licenseContractName;
            }
            return Accounts.getDisplayName(this.address);
        }
    }
});