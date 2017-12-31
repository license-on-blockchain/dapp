import {Settings} from "../lib/Settings";

Template.settings.helpers({
    enableInstallationChecked() {
        return Settings.enableInstallation.get() ? "checked" : "";
    },
    enableIssuerActionsChecked() {
        return Settings.enableIssuerActions.get() ? "checked" : "";
    },
    selectedLanguage(languageCode) {
        return Settings.language.get() === languageCode ? "selected" : "";
    }
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
    }
});