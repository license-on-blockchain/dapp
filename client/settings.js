import { Settings } from "../lib/Settings";

Template.settings.helpers({
    enableInstallationChecked() {
        return Settings.enableInstallation().get() ? "checked" : "";
    }
});

Template.settings.events({
    'change [name=enableInstallation]'(event) {
        Settings.enableInstallation().set(event.currentTarget.checked);
    }
});