import {PersistentReactiveVar} from "./PersistentReactiveVar";

let enableInstallation = undefined;
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