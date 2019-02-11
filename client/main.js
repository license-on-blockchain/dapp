import {Template} from 'meteor/templating';
import {lob} from "../lib/LOB";
import {Settings} from "../lib/Settings";
import './main.html';
import {PersistentCollections} from "../lib/PersistentCollections";
import {checkBrowserSetup} from "./shared/browsercheck";
import {arraysEqual} from "../lib/utils";
import {Accounts} from "../lib/Accounts";
import {handleUnknownEthereumError} from "../lib/ErrorHandling";
import {InitialLoadingStatus} from "../lib/InitialLoadingStatus";
import {TermsOfUsage} from "./consumerWallet/termsOfUsage";
import {Acknowledgements} from "./consumerWallet/acknowledgements";

let __lastAccounts = null;
function onAccountsChange(callback) {
    web3.eth.getAccounts((error, newAccounts) => {
        if (!error) {
            if (__lastAccounts !== null) {
                if (!arraysEqual(__lastAccounts, newAccounts)) {
                    callback();
                }
            }
            __lastAccounts = newAccounts;
        }
        setTimeout(() => onAccountsChange(callback), 1000);
    });
}

let __lastNetwork = null;
function onNetworkChange(callback) {
    web3.version.getNetwork((error, newNetwork) => {
        if (!error) {
            if (__lastNetwork !== null) {
                if (!arraysEqual(__lastNetwork, newNetwork)) {
                    callback();
                }
            }
            __lastNetwork = newNetwork;
        }
        setTimeout(() => onAccountsChange(callback), 1000);
    });
}

Template.body.onCreated(function() {

    checkBrowserSetup((success) => {
        if (!success) {
            Router.go('/browsercheck?origin=' + encodeURIComponent(Iron.Location.get().path));
        }
    });
});

Template.body.helpers({
    activeIfCurrentRoute(name) {
        let currentRoute;
        if (Router.current() && Router.current().route.getName()) {
            currentRoute = Router.current().route.getName();
            if (currentRoute.indexOf('.') !== -1) {
                currentRoute = currentRoute.substring(0, currentRoute.indexOf('.'));
            }
        } else {
            currentRoute = 'licenses';
        }
        return currentRoute === name ? 'active' : '';
    },
    enableInstallation() {
        return Settings.enableInstallation.get();
    },
    enableIssuerActions() {
        return Settings.enableIssuerActions.get();
    },
    enableVerificationActions() {
        return Settings.enableVerificationActions.get();
    },
    enableMarketplace() {
        return Settings.enableMarketplace.get();
    },
    showHeader() {
        let currentRoute;
        if (Router.current() && Router.current().route.getName()) {
            currentRoute = Router.current().route.getName();
            if (currentRoute.indexOf('.') !== -1) {
                currentRoute = currentRoute.substring(0, currentRoute.indexOf('.'));
            }
        } else {
            currentRoute = 'licenses';
        }
        return currentRoute !== 'browsercheck';
    }
});

Template.body.events({
    'click .termsOfUsageLink'(event) {
        event.preventDefault();
        TermsOfUsage.show();
    },
    'click .acknowledgementsLink'(event) {
        event.preventDefault();
        Acknowledgements.show();
    }
});

Meteor.startup(function() {
    if (Meteor.isClient) {
        Tracker.autorun(() => {
            TAPi18n.setLanguage(Settings.language.get()).fail((error) => {
                console.error(error)
            });
        });

        checkBrowserSetup((success) => {
            if (success) {
                EthAccounts.init();
                EthBlocks.init();

                InitialLoadingStatus.setHasFinishedLoading(false);

                PersistentCollections.init();
                PersistentCollections.afterAllInitialisations(() => {
                    lob.watchRootContractsForManagedLicenseContracts();
                    Accounts.fetch((accounts) => {
                        lob.watchAccountBalance(accounts).then(() => {
                            InitialLoadingStatus.setHasFinishedLoading(true);
                        }).catch((error) => {
                            handleUnknownEthereumError(error);
                        });
                    });
                });

                onAccountsChange(() => {
                    // Reload the dapp on accounts change since this is the easiest way to clear all non-persistent caches
                    location.reload();
                });
                onNetworkChange(() => {
                    // Reload the dapp on accounts change since this is the easiest way to clear all non-persistent caches
                    location.reload();
                });
            }
        });

        setTimeout(() => {
            if (!Settings.termsOfUsageShown.get()) {
                TermsOfUsage.show();
            }
        }, 1000);
    }
});
