import {IssuanceID} from "../../lib/IssuanceID";
import {IssuanceInfo} from "./issuanceInfo";

Template.selectIssuance.onCreated(function() {
    this.computations = new Set();
    TemplateVar.set(this, 'value', null);
    this.update = function() {
        const issuanceIDString = this.find('select').value;
        let issuanceID;
        if (issuanceIDString) {
            issuanceID = IssuanceID.fromString(issuanceIDString);
        } else {
            issuanceID = null;
        }
        TemplateVar.set(this, 'value', issuanceID);
    };
});

Template.selectIssuance.onRendered(function() {
    const updateComputation = Tracker.autorun(() => {
        // Let the update be triggered when the data changes
        Blaze.getData(this.view);
        setTimeout(() => {
            this.update();
        }, 0);
    });
    this.computations.add(updateComputation);
});

Template.selectIssuance.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.selectIssuance.helpers({
    issuances() {
        return this.issuances;
    }
});

Template.selectIssuance.events({
    'change select'() {
        Template.instance().update();
    },
    'click .issuanceInfoButton'(event) {
        event.preventDefault();
        IssuanceInfo.show(TemplateVar.get('value'));
    }
});

Template.issuanceOption.helpers({
    issuanceID() {
        return this.issuanceID;
    },
    preselected() {
        return this.selected ? 'selected' : '';
    },
    description() {
        return this.metadata.description;
    },
    balance() {
        return this.balance;
    },
});