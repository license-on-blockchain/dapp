import {handleUnknownEthereumError} from "./ErrorHandling";

export const Accounts = {
    /**
     * Get the accounts managed by the wallet reactively. That is, the computation will rerun if the list of accounts
     * changes
     * @returns {string[]}
     */
    get() {
        const accounts = this._storage.get();
        if (accounts === undefined) {
            this.fetch((accounts) => {
                this._storage.set(accounts);
            })
        }
        return accounts;
    },

    /**
     * @param {function(string[])} callback
     */
    fetch(callback) {
        web3.eth.getAccounts((error, accounts) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(accounts);
        });
    }
};

Accounts._storage = new ReactiveVar(undefined);