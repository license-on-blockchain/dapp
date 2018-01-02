import {Template} from 'meteor/templating';
import {lob} from "../lib/LOB";
import {Settings} from "../lib/Settings";
import {RootContracts} from "../lib/RootContracts";
import './main.html';
import {PersistentCollections} from "../lib/PersistentCollections";
import {checkBrowserSetup} from "./shared/browsercheck";
import {arraysEqual} from "../lib/utils";

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
            Router.go('browsercheck');
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

                PersistentCollections.init();
                PersistentCollections.afterAllInitialisations(() => {
                    for (const rootContractAddress of RootContracts.getAddresses()) {
                        lob.watchRootContract(rootContractAddress);
                    }
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
    }
});