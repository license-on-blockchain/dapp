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
    Settings.enableVerificationActions = new PersistentReactiveVar('lob_enableVerificationActions', (value) => {
        return value === "true";
    });
    Settings.enableMarketplace = new PersistentReactiveVar('lob_enableMarketplace', (value) => {
        return value !== "false";
    });
    Settings.enableDebugOptions = new PersistentReactiveVar('lob_enableDebugOptions', (value) => {
        return value === "true";
    });
    /**
     * 0: No logging
     * 1: Duplicate execution logging
     * 2: Log every web3 call
     * @type {PersistentReactiveVar}
     */
    Settings.web3LoggingLevel = new PersistentReactiveVar('lob_web3LoggingLevel', (value) => {
        return Number(value || 0);
    });
    /**
     * Artificial latency introduced for each web3 call. In ms
     * @type {PersistentReactiveVar}
     */
    Settings.web3Latency = new PersistentReactiveVar('lob_web3Latency', (value) => {
        return Number(value || 0);
    });
    Settings.trackerRunDebugging = new PersistentReactiveVar('lob_trackerRunDebugging', (value) => {
        return value === "true";
    });
    Settings.language = new PersistentReactiveVar('lob_language', (value) => {
        if (!value) {
            return TAPi18n.getLanguage() || 'en';
        } else {
            return value;
        }
    });
    Settings.termsOfUsageShown = new PersistentReactiveVar('lob_termsOfUsageShown', (value) => {
        return value === "true";
    });
}