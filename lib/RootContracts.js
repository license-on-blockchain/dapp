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
                address: "0x6EA80592B86afF57f17941f0BC5708D9cd41c5e5".toLowerCase(),
                name: "RC2",
                network: 1337,

            },
            {
                address: "0x4d32579036423B65887E542B82151fA67C8039eE".toLowerCase(),
                name: "RC3",
                network: 1337,

            },
            {
                address: "0x2f19f717Ff5b4d77c9Ea19799D583896907832EE".toLowerCase(),
                name: "RC4",
                network: 1337,

            },
            {
                address: "0x5cD6e6444953f841fD0c28924A1279ccB8978D5D".toLowerCase(),
                name: "RC5",
                network: 1337,

            },
            {
                address: "0x41523Cf9372040D486a946DA53793319C5E806cC".toLowerCase(),
                name: "Ropsten",
                network: 3,
            }
        ];
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