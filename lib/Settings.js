import {PersistentReactiveVar} from "./PersistentReactiveVar";

let enableInstallation = undefined;

export const Settings = {
    enableInstallation() {
        if (!enableInstallation) {
            enableInstallation = new PersistentReactiveVar('lob_enableInstallation', (value) => {
                return value === "true";
            });
        }
        return enableInstallation;
    }
};