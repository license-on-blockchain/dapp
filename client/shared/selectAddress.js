Template.selectAddress.onCreated(function() {
    this.update = function() {
        if (this.view.isRendered) {
            const address = this.find('select').value;
            TemplateVar.set(this, 'value', address);
        }
    };
});

Template.selectAddress.onRendered(function() {
    Tracker.autorun(() => {
        setTimeout(() => {
            this.update();
        });
    });
});

Template.selectAddress.helpers({
    addresses() {
        // Update whenever the addresses change
        // This is actually a pretty awful hack, but I haven't found a better way to listen to changes of this.addresses
        Template.instance().update();
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
    }
});