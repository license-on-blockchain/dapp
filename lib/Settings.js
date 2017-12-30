import {PersistentReactiveVar} from "./PersistentReactiveVar";

export const Settings = {
};

if (Meteor.isClient) {
    Settings.enableInstallation = new PersistentReactiveVar('lob_enableInstallation', (value) => {
        return value === "true";
    });
    Settings.enableIssuerActions = new PersistentReactiveVar('lob_enableIssuerActions', (value) => {
        return value === "true";
    });
    Settings.language = new PersistentReactiveVar('lob_language', (value) => {
        if (!value) {
            return TAPi18n.getLanguage() || 'en';
        } else {
            return value;
        }
    });
}