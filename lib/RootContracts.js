import {getRootContract} from "./lob/contractRetrieval";
import {PersistentCollections} from "./PersistentCollections";

export class RootContracts {
    /**
     * @param {LicenseContracts} licenseContracts
     */
    constructor(licenseContracts) {
        this._licenseContracts = licenseContracts;

        this._contracts = [
            {
                address: "0x49e63006b1Ac5c63fb26c00ab05E8fc0Fb70F74d".toLowerCase(),
                name: "Local",
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
}