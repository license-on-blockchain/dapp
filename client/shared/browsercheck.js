import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

// The user has not granted access to connect with his Ethereum account via ethereum.enable()
const ethereumAccessNotAuthorized = new ReactiveVar(false);
// The user is currently being asked to connect with his Ethereum account via ethereum.enable()
const pendingEthereumAccessPopup = new ReactiveVar(false);

const Browser = {
    Other: 0,
    Firefox: 1,
    Chrome: 2,
};

function getBrowser() {
    if (navigator.userAgent.indexOf("Firefox") !== -1) {
        const [_, version] = /Firefox\/([0-9]*)/.exec(navigator.userAgent);
        return {browser: Browser.Firefox, version: Number(version)};
    } else if (navigator.userAgent.indexOf("Chrome") !== -1) {
        const [_, version] = /Chrome\/([0-9]*)/.exec(navigator.userAgent);
        return {browser: Browser.Chrome, version: Number(version)};
    } else {
        return {browser: Browser.Other, version: 0};
    }
}

function metamaskLocked() {
    return web3.currentProvider.isMetaMask && web3.eth.accounts.length === 0;
}

export function checkBrowserSetup(callback) {
    if (typeof web3 === 'undefined') {
        callback(false);
        return;
    }
    web3.eth.getAccounts((error, accounts) => {
        if (error) { handleUnknownEthereumError(error); return; }
        if (web3.currentProvider.isMetaMask && accounts.length === 0) {
            callback(false);
        } else {
            callback(true);
        }
    });
}

let pollBrowserCheckTimeout = null;

function pollBrowserCheck() {
    if (pollBrowserCheckTimeout) {
        clearTimeout(pollBrowserCheckTimeout);
        pollBrowserCheckTimeout = null;
    }
    checkBrowserSetup((success) => {
        if (success) {
            window.location = '/';
        } else {
            pollBrowserCheckTimeout = setTimeout(pollBrowserCheck, 1000);
        }
    });
}

function requestEthereumAccess() {
    pendingEthereumAccessPopup.set(true);
    window.ethereum.enable().then(() => {
        ethereumAccessNotAuthorized.set(false);
    }, (error) => {
        ethereumAccessNotAuthorized.set(true);
    }).finally(() => {
        console.log("FOO");
        pendingEthereumAccessPopup.set(false);
        pollBrowserCheck();
    });
}

Template.browsercheck.onRendered(function() {
    if (window.ethereum) {
        // ethereum.enable is available. Ask the user for permission to connect with his
        // Ethereum account.
        requestEthereumAccess();
    } else {
        // Legacy fallback. Directly access web3.
        pollBrowserCheck();
    }
});

Template.browsercheck.helpers({
    browserInvalid() {
        switch (getBrowser().browser) {
            case Browser.Firefox:
            case Browser.Chrome:
                return false;
            default:
                return true;
        }
    },
    firefoxVersionTooLow() {
        const {browser, version} = getBrowser();
        return browser === Browser.Firefox && version < 57;
    },
    chromeVersionTooLow() {
        const {browser, version} = getBrowser();
        return browser === Browser.Chrome && version < 63;
    },
    isChrome() {
        return getBrowser().browser === Browser.Chrome;
    },
    isFirefox() {
        return getBrowser().browser === Browser.Firefox;
    },
    metamaskNotInstalled() {
        return typeof web3 === 'undefined';
    },
    pendingEthereumAccessPopup() {
        return pendingEthereumAccessPopup.get();
    },
    ethereumAccessNotAuthorized() {
        return ethereumAccessNotAuthorized.get();
    },
    metamaskLocked() {
        return metamaskLocked();
    },
});

Template.browsercheck.events({
    'click button#requestEthereumAccess'() {
        requestEthereumAccess();
    }
});