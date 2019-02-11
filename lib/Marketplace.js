import {Cookie} from "./Cookie";
import {Settings} from "./Settings";
import {IssuanceID} from "./IssuanceID";
import {handleUnknownMarketplaceError} from "./ErrorHandling";
import {NotificationCenter} from "./NotificationCenter";

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
                debugger;
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
            headers['Authorization'] = 'LOB_AUTHORIZATION_TOKEN token="' + token + '"';
            requestImpl(type, baseUrl + url, headers, data, (error) => {
                if (error.domain === 'authorization' && error.code === 110) {
                    // Authorization token does not exist or has expired.
                    // Delete the login token and fire the same request off again. This way we'll generate a new
                    // login token.
                    Marketplace.deleteLoginToken(options.loginAccount);
                    request(type, url, options, onError, onSuccess);
                } else {
                    onError(error);
                }
            }, onSuccess);
        });
    } else {
        requestImpl(type, baseUrl + url, headers, data, onError, onSuccess);
    }
}

function getAuthenticationChallenge(account, onError, onSuccess) {
    let data = {
        address: account
    };
    request('POST', '/authentication/challenge', {data: data}, onError, function(data) {
        onSuccess(data.message);
    });
}

function signChallenge(account, challenge, onError, onSuccess) {
    const params = [challenge, account];
    const method = 'personal_sign';
    web3.currentProvider.sendAsync({
        method,
        params,
        account,
    }, function (error, result) {
        error = error || result.error;
        if (error) {
            onError(error);
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
    request('POST', '/authentication/token', {data: data}, onError, function(data) {
        onSuccess({
            token: data.token,
            validUntil: new Date(data.validUntil * 1000),
        });
    });
}

function getLoginToken(account, onError, onSuccess) {
    let loginToken = localStorage.getItem('marketplace.loginToken.' + account);
    if (loginToken) {
        onSuccess(loginToken);
        return;
    }

    getAuthenticationChallenge(account, onError, function(challenge) {
        signChallenge(account, challenge, onError, function(signature) {
            submitSignature(account, challenge, signature, onError, function(result) {
                localStorage.setItem('marketplace.loginToken.' + account, result.token);
                onSuccess(result.token);
            });
        });
    });
}

export const Marketplace = {
    _accountDetails: {},
    /**
     * Get the account details that are associated with the given account on the LOB marketplace. This requires that the
     * user owns the given account.
     * @param {string} account The account for which the email address shall be retrieved
     * @returns {{name: string, email: string}|null|undefined} Object if account details have been fetched, null if no
     *          account details exist, undefined while details are loading
     */
    getAccountDetails(account) {
        if (!this._accountDetails[account]) {
            this._accountDetails[account] = new ReactiveVar(undefined);
            request('GET', '/account', {loginAccount: account}, (error) => {
                if (error.domain === 'account' && error.code === 1110) {
                    this._accountDetails[account].set(null);
                } else {
                    NotificationCenter.showError(error);
                }
            }, (data) => {
                this._accountDetails[account].set({
                    name: data.name,
                    email: data.email
                });
            });
        }
        return this._accountDetails[account].get();
    },
    isAccountRegistered(account) {
        const accountDetails = this.getAccountDetails(account);
        return accountDetails !== null;
    },
    /**
     * Update the account details stored on the LOB marketplace
     * @param {string} account The account to update
     * @param {string} name The name to set for this account
     * @param {string} email The email address to set for this account
     * @param {function(object)} onError An error callback
     * @param {function()} onSuccess A success callback
     */
    updateAccount(account, name, email, onError, onSuccess) {
        account = account.toLowerCase();
        const data = {
            name: name,
            email: email,
            confirmEmailUrl: window.location.origin + '/marketplace/confirmemail',
        };
        request('PUT', '/account', {loginAccount: account, data: data}, onError, (data) => {
            this._accountDetails[account].set({
                name: data.name,
                email: data.email
            });
            onSuccess();
        });
    },
    confirmEmail(account, challenge, onError, onSuccess) {
        account = account.toLowerCase();
        const data = {
            challenge: challenge
        };
        request('PUT', '/account/emailconfirmation', {loginAccount: account, data: data}, onError, () => {
            onSuccess();
        });
    },

    deleteLoginToken(account) {
        localStorage.removeItem('marketplace.loginToken.' + account);
    },
    deleteAccount(account, onError, onSuccess) {
        account = account.toLowerCase();
        request('DELETE', '/account', {loginAccount: account}, onError, () => {
            this.deleteLoginToken(account);
            delete this._accountDetails[account];
            onSuccess();
        });
    },

    _offers: {
        offers: new ReactiveVar([]),
        upToDate: false,
        fetchInProgress: false
    },
    /**
     * @param {IssuanceID} issuanceID
     * @param {string} seller
     * @param {boolean} soldSeparately
     * @param {number} amount
     * @param {number} price
     * @param {number} negotiable
     * @private
     */
    _updateOffer(issuanceID, seller, soldSeparately, amount, price, negotiable) {
        let offers = this._offers.offers.get();
        // Delete the current offer for this issuance
        offers = offers.filter((offer) => {
            return !(offer.issuanceID === issuanceID && offer.seller === seller);
        });
        // Add the new offer
        offers.push({
            issuanceID: issuanceID,
            seller: seller,
            soldSeparately: soldSeparately,
            amount: amount,
            price: price,
            negotiable: negotiable,
        });
        this._offers.offers.set(offers);
    },

    /**
     * @param {IssuanceID} issuanceID
     * @param {string} seller
     * @private
     */
    _deleteOffer(issuanceID, seller) {
        let offers = this._offers.offers.get();
        offers = offers.filter((offer) => {
            return !(offer.issuanceID === issuanceID && offer.seller === seller);
        });
        this._offers.offers.set(offers);
    },

    /**
     * Submit a new offer to the LOB Marketplace. If the offer already exists, udpate it.
     * @param {string} seller The address that is offering to sell the license
     * @param {IssuanceID} issuanceID The issuance that is offered for sale
     * @param {number} price The proposed price per license
     * @param {number} amount The number of licenses offered for sale
     * @param {boolean} soldSeparately Whether the seller is willing to sell the licenses separately or only as a batch.
     * @param {boolean} negotiable Whether the price is negotiable
     * @param {function({domain: string, code: number, message: string})} onError Callback to be called if an error
     *                                                                            occurs
     * @param {function()} onSuccess Callback to be called when the offer is submitted sucessfully
     */
    submitOffer(seller, issuanceID, price, amount, soldSeparately, negotiable, onError, onSuccess) {
        seller = seller.toLowerCase();
        const data = {
            price: price,
            amount: amount,
            soldSeparately: soldSeparately,
            negotiable: negotiable,
        };
        const licenseContract = issuanceID.licenseContractAddress;
        const issuanceNumber = issuanceID.issuanceNumber;

        const url = '/offer/' + licenseContract + '/' + issuanceNumber;

        request('PUT', url, {loginAccount: seller, data: data}, onError, () => {
            this._updateOffer(issuanceID, seller, soldSeparately, amount, price, negotiable);
            onSuccess();
        });
    },

    /**
     * Delete the offer by the given seller for the given issuance.
     * @param {string} seller
     * @param {IssuanceID} issuanceID
     * @param {function({domain: string, code: number, message: string})} onError
     * @param {function()} onSuccess
     */
    deleteOffer(seller, issuanceID, onError, onSuccess) {
        seller = seller.toLowerCase();

        const licenseContract = issuanceID.licenseContractAddress;
        const issuanceNumber = issuanceID.issuanceNumber;

        const url = '/offer/' + licenseContract + '/' + issuanceNumber;

        request('DELETE', url, {loginAccount: seller}, onError, () => {
            this._deleteOffer(issuanceID, seller);
            onSuccess();
        });
    },

    _refreshOffers() {
        this._offers.fetchInProgress = true;
        request('GET', '/offer', {}, handleUnknownMarketplaceError, (data) => {
            const offers = data.map((offer) => {
                return {
                    issuanceID: IssuanceID.fromComponents(offer.licenseContract, offer.issuanceID),
                    seller: offer.seller,
                    soldSeparately: offer.soldSeparately,
                    amount: offer.amount,
                    price: offer.price,
                    negotiable: offer.negotiable,
                }
            });
            this._offers.offers.set(offers);
            this._offers.upToDate = true;
            this._offers.fetchInProgress = false;
        });
    },
    /**
     * Get all offers on the marketplace that match the given filter
     * @param {object|null} filter A filter that all returned issuances need to match. By default, all offers are
     *                             returned. Possible values are:
     *                             - seller: Return only offers by this seller
     *                             - issuanceID: Return only offers for this issuance ID
     * @returns {[{issuanceID: IssuanceID, seller: string, soldSeparately: boolean, amount: number, price: number, negotiable: boolean}]}
     */
    getOffers(filter = null) {
        if (!this._offers.upToDate && !this._offers.fetchInProgress) {
            this._refreshOffers();
        }
        let offers = this._offers.offers.get();
        if (filter) {
            offers = offers.filter((offer) => {
                if (filter.seller && filter.seller !== offer.seller) {
                    return false;
                }
                if (filter.issuanceID && filter.issuanceID !== offer.issuanceID) {
                    return false;
                }
                return true;
            });
        }
        return offers;
    },

    /**
     * Send a message with the given content to the seller of the given offer.
     * @param {string} sender The sender of the message
     * @param {IssuanceID} issuanceID The issuance this message is about
     * @param {string} seller The seller of the given issuance
     * @param {string} content The content of the message
     * @param {function(object)} onError An error callback
     * @param {function()} onSuccess A success callback
     */
    sendMessage(sender, issuanceID, seller, content, onError, onSuccess) {
        sender = sender.toLowerCase();
        seller = seller.toLowerCase();

        const data = {
            licenseContract: issuanceID.licenseContractAddress,
            issuance: issuanceID.issuanceNumber,
            seller: seller,
            content: content,
        };

        request('POST', '/message', {loginAccount: sender, data: data}, onError, () => {
            onSuccess();
        });
    }
};
