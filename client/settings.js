import {Settings} from "../lib/Settings";
import {PersistentCollections} from "../lib/PersistentCollections";
import {Marketplace} from "../lib/Marketplace";
import {Accounts} from "../lib/Accounts";

Template.settings.helpers({
    enableInstallationChecked() {
        return Settings.enableInstallation.get() ? "checked" : "";
    },
    showEnableInstallation() {
        return this.advanced || Settings.enableInstallation.get();
    },
    enableIssuerActionsChecked() {
        return Settings.enableIssuerActions.get() ? "checked" : "";
    },
    showEnableIssuerActions() {
        return this.advanced || Settings.enableIssuerActions.get();
    },
    enableVerificationActionsChecked() {
        return Settings.enableVerificationActions.get() ? "checked" : "";
    },
    enableMarketplaceChecked() {
        return Settings.enableMarketplace.get() ? "checked" : "";
    },
    enableDebugOptionsChecked() {
        return Settings.enableDebugOptions.get() ? "checked" : "";
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
    debugOptionsEnabled() {
        return Settings.enableDebugOptions.get();
    },
    trackerRunDebuggingChecked() {
        return Settings.trackerRunDebugging.get() ? "checked" : "";
    },
    marketplaceEnabled() {
        return Settings.enableMarketplace.get();
    },
    showEnableDebugOptions() {
        return this.advanced || Settings.enableDebugOptions.get();
    },
});

Template.settings.events({
    'change [name=enableInstallation]'(event) {
        Settings.enableInstallation.set(event.currentTarget.checked);
    },
    'change [name=enableIssuerActions]'(event) {
        Settings.enableIssuerActions.set(event.currentTarget.checked);
    },
    'change [name=enableVerificationActions]'(event) {
        Settings.enableVerificationActions.set(event.currentTarget.checked);
    },
    'change [name=enableMarketplace]'(event) {
        Settings.enableMarketplace.set(event.currentTarget.checked);
    },
    'click button.editMarketplaceAccount'(event) {
        event.preventDefault();
        Router.go('marketplace.account');
    },
    'change [name=enableDebugOptions]'(event) {
        Settings.enableDebugOptions.set(event.currentTarget.checked);
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
    'change [name=trackerRunDebugging]'(event) {
        Settings.trackerRunDebugging.set(event.currentTarget.checked);
        location.reload();
    },
    'click button.deleteLocalData'(event) {
        event.preventDefault();
        if (confirm(TAPi18n.__('settings.confirmation.deleteLocalData'))) {
            PersistentCollections.clearAll();
            Accounts.fetch((accounts) => {
                for (const account of accounts) {
                    Marketplace.deleteLoginToken(account);
                }
            });
            location.reload();
        }
    }
});
