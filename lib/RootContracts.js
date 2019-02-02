import {getRootContract} from "./lob/contractRetrieval";
import {PersistentCollections} from "./PersistentCollections";
import {handleUnknownEthereumError} from "./ErrorHandling";

export class RootContracts {
    /**
     * @param {LicenseContracts} licenseContracts
     */
    constructor(licenseContracts) {
        this._licenseContracts = licenseContracts;
        this._rootContracts = new Mongo.Collection('rootContracts', {connection: null});

        this._contracts = [
            {
                address: "0x3a32B6ACD4c703b825913beD8eE47cB8ff18703e".toLowerCase(),
                name: "Main",
                network: 1,
            },
            {
                address: "0x3a32B6ACD4c703b825913beD8eE47cB8ff18703e".toLowerCase(),
                name: "Ropsten",
                network: 3,
            },
            {
                address: "0x92245624616419290E2aF43a2B26CD7a8a0e96cB".toLowerCase(),
                name: "Legacy contract (don't use anymore)",
                network: 3,
            },
        ];

        if (Meteor.isClient) {
            const localRootContractsString = localStorage.getItem('dev_localRootContracts');
            if (localRootContractsString) {
                const localRootContracts = localRootContractsString.split(',');
                for (let i = 0; i < localRootContracts.length; i++) {
                    const localRootContract = localRootContracts[i];
                    this._contracts.push({
                        address: localRootContract.toLowerCase(),
                        name: "Local",
                        network: 1337,
                    });
                }
            }
        }
    }

    /**
     * For each root contract get an object of the format `{address, name}`
     * @return {Promise.<object[]>}
     */
    getAddressesAndNames() {
        return new Promise((resolve, reject) => {
            web3.version.getNetwork((error, network) => {
                if (error) {
                    reject(error);
                } else {
                    const contracts = this._contracts.filter((contract) => contract.network === Number(network));
                    resolve(contracts);
                }
            });
        });
    }

    /**
     * Get the addresses of all root contracts
     * @return {Promise.<string[]>}
     */
    getAddresses() {
        return this.getAddressesAndNames().then((contracts) => {
            return contracts.map((contract) => contract.address);
        });
    }

    /**
     * @param {string[]} rootContractAddresses
     * @return {Promise.<string[]>}
     */
    getLicenseContracts(rootContractAddresses) {
        const licenseContractCounts = rootContractAddresses.map((rootContractAddress) => {
            return new Promise((resolve, reject) => {
                const rootContract = getRootContract(rootContractAddress);
                rootContract.licenseContractCount((error, licenseContractCount) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({rootContractAddress, licenseContractCount});
                    }
                });
            });
        });

        return Promise.all(licenseContractCounts).then((counts) => {
            const addressPromises = [];

            for (const {rootContractAddress, licenseContractCount} of counts) {
                for (let i = 0; i < licenseContractCount.toNumber(); i++) {
                    addressPromises.push(this._licenseContracts.getLicenseContractOfRootContract(rootContractAddress, i));
                }
            }
            return Promise.all(addressPromises);
        });
    }

    /**
     * @param {string} rootContractAddress
     * @return {boolean}
     */
    isDisabled(rootContractAddress) {
        const rootContractRecord = this._rootContracts.findOne({_id: rootContractAddress, disabled: {$exists: true}});
        if (rootContractRecord) {
            return rootContractRecord.disabled;
        } else {
            const rootContract = getRootContract(rootContractAddress);
            rootContract.disabled((error, disabled) => {
                if (error) { handleUnknownEthereumError(error); return; }
                this._rootContracts.upsert({_id: rootContractAddress}, {$set: {disabled}});
            });
            return false;
        }
    }
}