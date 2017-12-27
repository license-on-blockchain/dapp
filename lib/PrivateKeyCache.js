class PrivateKeyCache {
    constructor() {
        this._transactionPrivateKeys = {};
        this._contractPrivateKeys = {};
    }

    /**
     * Cached the private key associated to a transaction hash because its license contract has not been created yet
     * @param {string} transactionHash The hash of the transaction that will create the license contract for this
     *                                 SSL private key
     * @param {string} privateKey The SSL private key
     */
    addPrivateKeyForTransaction(transactionHash, privateKey) {
        this._transactionPrivateKeys[transactionHash] = privateKey;
    }

    /**
     * Associate the SSL private key that was previously stored with a transaction hash with a license contract address.
     * This removes the storage of the private key under the given transaction hash.
     * @param {string} transactionHash The transaction hash the private key was previously saved under
     * @param {string} licenseContractAddress The address of the license contract this private key belongs to
     */
    associateTransactionPrivateKeyWithContractAddress(transactionHash, licenseContractAddress) {
        this._contractPrivateKeys[licenseContractAddress] = this._transactionPrivateKeys[transactionHash];
        delete this._transactionPrivateKeys[transactionHash];
    }

    /**
     * Retrieve the private key stored for the given license contract if it exists
     * @param {string} licenseContractAddress
     * @return {string|undefined}
     */
    getPrivateKeyForContractAddress(licenseContractAddress) {
        return this._contractPrivateKeys[licenseContractAddress];
    }

    /**
     * Delete the private key stored for the given license contract
     * @param {string} licenseContractAddress
     */
    clearPrivateKeyForContractAddress(licenseContractAddress) {
        delete this._contractPrivateKeys[licenseContractAddress];
    }
}

export const privateKeyCache = new PrivateKeyCache();