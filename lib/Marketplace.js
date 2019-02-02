import {Cookie} from "./Cookie";
import {Settings} from "./Settings";

let baseUrl = "https://api.marketplace.license-on-blockchain.org";
if (Meteor.isClient) {
    let overrideMarketplaceUrl = window.localStorage.getItem('dev_marketplaceBaseURL');
    if (overrideMarketplaceUrl) {
        baseUrl = overrideMarketplaceUrl;
    }
}

function requestImpl(type, url, headers, data, onError, onSuccess) {
    $.ajax(url, {
        cache: false,
        dataType: 'json',
        contentType: 'application/json',
        data: data,
        type: type,
        headers: headers,
        error: function(jqXHR) {
            if (typeof jqXHR.responseJSON === 'object') {
                onError({
                    domain: jqXHR.responseJSON.domain,
                    code: jqXHR.responseJSON.code,
                    message: jqXHR.responseJSON.message
                });
            } else {
                onError({
                    domain: 'wallet.urlRequest',
                    code: 0,
                    message: 'Error retrieving ' + url
                });
            }
        },
        success: function(data) {
            onSuccess(data);
        }
    });
}

function request(type, url, options, onError, onSuccess) {
    let data = (typeof options.data !== 'undefined') ? JSON.stringify(options.data) : null;

    let headers = {
        'Accept-Language': Settings.language.get(),
    };
    if (options.loginAccount) {
        getLoginToken(options.loginAccount, onError, (token) => {
            headers['Authorization'] = 'LoginToken token="' + token + '"';
            requestImpl(type, baseUrl + url, headers, data, onError, onSuccess);
        });
    } else {
        requestImpl(type, baseUrl + url, headers, data, onError, onSuccess);
    }
}

function getAuthenticationChallenge(account, onError, onSuccess) {
    let data = {
        address: account
    };
    request('POST', '/authenticate/challenge', {data: data}, onError, function(data) {
        onSuccess(data.message);
    });
}

function signChallenge(account, challenge, onError, onSuccess) {
    var params = [challenge, account];
    var method = 'personal_sign';
    web3.currentProvider.sendAsync({
        method,
        params,
        account,
    }, function (err, result) {
        if (err) {
            onError(err);
        } else {
            onSuccess(result.result);
        }
    });
}

function submitSignature(account, challenge, signature, onError, onSuccess) {
    let data = {
        address: account,
        message: challenge,
        signature: signature
    };
    request('POST', '/authenticate/token', {data: data}, onError, function(data) {
        onSuccess({
            token: data.token,
            validUntil: new Date(data.validUntil * 1000),
        });
    });
}

function getLoginToken(account, onError, onSuccess) {
    let loginToken = Cookie.read('marketplace.loginToken.' + account);
    if (loginToken) {
        onSuccess(loginToken);
        return;
    }

    getAuthenticationChallenge(account, onError, function(challenge) {
        signChallenge(account, challenge, onError, function(signature) {
            submitSignature(account, challenge, signature, onError, function(result) {
                Cookie.set('marketplace.loginToken.' + account, result.token, result.validUntil);
                onSuccess(result.token);
            });
        });
    });
}

export const Marketplace = {
    getEmailAddress(account, onError, onSuccess) {
        request('GET', '/account/email', {loginAccount: account}, onError, function(data) {
            onSuccess(data.email);
        });
    },
    submitOffer(account, issuanceID, price, amount, soldSeparately, negotiable, onError, onSuccess) {
        const data = {
            price: price,
            amount: amount,
            soldSeparately: soldSeparately,
            negotiable: negotiable,
        };
        let licenseContract = issuanceID.licenseContractAddress;
        let issuanceNumber = issuanceID.issuanceNumber;

        let url = '/offer/' + licenseContract + '/' + issuanceNumber;

        request('PUT', url, {loginAccount: account, data: data}, onError, function() {
            onSuccess();
        });
    }
};