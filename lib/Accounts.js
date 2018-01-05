import {handleUnknownEthereumError} from "./ErrorHandling";
import {PersistentCollections} from "./PersistentCollections";

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
        return accounts || [];
    },

    getInternalName(address) {
        const doc = PersistentCollections.accounts.findOne({_id: address});
        if (doc) {
            return doc.internalName;
        } else {
            return null;
        }
    },

    setInternalName(address, name) {
        PersistentCollections.accounts.upsert({_id: address}, {$set: {
            internalName: name
        }});
    },

    /**
     * @param {function(string[])} callback
     */
    fetch(callback) {
        web3.eth.getAccounts((error, accounts) => {
            if (error) { handleUnknownEthereumError(error); return; }
            callback(accounts);
        });
    },

    getDisplayName(address) {
        const internalDisplayName = this.getInternalName(address);
        if (internalDisplayName) {
            return internalDisplayName;
        }
        const accountsRecord = EthAccounts.findOne({address});
        if (accountsRecord) {
            return accountsRecord.name || address;
        }
        return address;
    }
};

Accounts._storage = new ReactiveVar(undefined);