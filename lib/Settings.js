import {PersistentReactiveVar} from "./PersistentReactiveVar";

let enableInstallation = undefined;
let enableIssuerActions = undefined;
let language = undefined;

export const Settings = {
    enableInstallation() {
        if (!enableInstallation) {
            enableInstallation = new PersistentReactiveVar('lob_enableInstallation', (value) => {
                return value === "true";
            });
        }
        return enableInstallation;
    },
    enableIssuerActions() {
        if (!enableIssuerActions) {
            enableIssuerActions = new PersistentReactiveVar('lob_enableIssuerActions', (value) => {
                return value === "true";
            });
        }
        return enableIssuerActions;
    },
    language() {
        if (!language) {
            language = new PersistentReactiveVar('lob_language', (value) => {
                if (!value) {
                    return TAPi18n.getLanguage();
                } else {
                    return value;
                }
            });
        }
        return language;
    },
};