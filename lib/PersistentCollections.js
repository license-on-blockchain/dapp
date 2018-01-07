const initialisationCallbacks = [];
let initialisationFinished = false;

export const PersistentCollections = {
    licenseContracts: new Mongo.Collection('licenseContracts', {connection: null}),
    transactions: new Mongo.Collection('transactions', {connection: null}),
    accounts: new Mongo.Collection('accounts', {connection: null}),
    /**
     * Call the given callback after all persistent collections have been initialised from indexedDB
     * @param {function} callback
     */
    afterAllInitialisations(callback) {
        if (initialisationFinished) {
            callback();
        } else {
            initialisationCallbacks.push(callback);
        }
    },
    clearAll() {
        for (const [key, collection] of Object.entries(PersistentCollections)) {
            if (typeof collection === 'function') {
                continue;
            }
            collection.remove({});
        }
        localforage.clear();
    },
    init() {
        const initialisationPromises = [];
        for (const [key, collection] of Object.entries(PersistentCollections)) {
            if (typeof collection === 'function') {
                continue;
            }
            const promise = new Promise((resolve, reject) => {
                new PersistentMinimongo2(collection, 'lob_wallet', () => {
                    resolve();
                });
            });
            initialisationPromises.push(promise);
        }

        Promise.all(initialisationPromises).then(() => {
            initialisationFinished = true;
            for (const initialisationCallback of initialisationCallbacks) {
                initialisationCallback();
            }
        });
    }
};