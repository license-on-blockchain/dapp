import {Settings} from "../lib/Settings";
import {PersistentCollections} from "../lib/PersistentCollections";

Template.settings.helpers({
    enableInstallationChecked() {
        return Settings.enableInstallation.get() ? "checked" : "";
    },
    enableIssuerActionsChecked() {
        return Settings.enableIssuerActions.get() ? "checked" : "";
    },
    selectedLanguage(languageCode) {
        return Settings.language.get() === languageCode ? "selected" : "";
    },
    selectedWeb3LoggingLevel(loggingLevel) {
        return Settings.web3LoggingLevel.get() === loggingLevel ? "selected" : "";
    },
    selectedWeb3Latency(latency) {
        return Settings.web3Latency.get() === latency ? "selected" : "";
    },
});

Template.settings.events({
    'change [name=enableInstallation]'(event) {
        Settings.enableInstallation.set(event.currentTarget.checked);
    },
    'change [name=enableIssuerActions]'(event) {
        Settings.enableIssuerActions.set(event.currentTarget.checked);
    },
    'change [name=language]'(event) {
        Settings.language.set(event.currentTarget.value);
    },
    'change [name=web3LoggingLevel]'(event) {
        Settings.web3LoggingLevel.set(Number(event.currentTarget.value));
        location.reload();
    },
    'change [name=web3Latency]'(event) {
        Settings.web3Latency.set(Number(event.currentTarget.value));
        location.reload();
    },
    'click button.clearCaches'(event) {
        event.preventDefault();
        if (confirm(TAPi18n.__('settings.confirmation.clearCaches'))) {
            PersistentCollections.clearAll();
            location.reload();
        }
    }
});