import {Settings} from "../../lib/Settings";

export const TermsOfUsage = {
    show() {
        EthElements.Modal.show({
            template: 'termsOfUsage',
            class: 'mediumModal'
        });
    }
};

Template.termsOfUsage.events({
    'click button.hideModal'() {
        Settings.termsOfUsageShown.set(true);
        EthElements.Modal.hide();
    },
});