import {handleUnknownEthereumError} from "../../lib/ErrorHandling";

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

function pollBrowserCheck() {
    checkBrowserSetup((success) => {
        if (success) {
            window.location = '/';
        } else {
            setTimeout(pollBrowserCheck, 1000);
        }
    });
}

Template.browsercheck.onRendered(function() {
    pollBrowserCheck();
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
    metamaskLocked() {
        return metamaskLocked();
    }
});