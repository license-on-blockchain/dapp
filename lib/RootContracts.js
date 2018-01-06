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
                address: "0x1ce71cEe61f4090b020CD920FD4546dC7ad18e1F".toLowerCase(),
                name: "Local v3"
            },
            {
                address: "0xEe36Fd7fa894dADF751f1f7740C13f11ca6D6adA".toLowerCase(),
                name: "Local v4"
            },
            {
                address: "0x1Efbf59fff85322388E768dAa3ac2C5A8B1C078f".toLowerCase(),
                name: "Local v5"

            },
            {
                address: "0xd007097E6b805be5E385fB8eE3798aefc3f2061A".toLowerCase(),
                name: "Ropsten"
            }
        ];
    }

    /**
     * For each root contract get an object of the format `{address, name}`
     * @return {object[]}
     */
    getAddressesAndNames() {
        return this._contracts;
    }

    /**
     * Get the addresses of all root contracts
     * @return {string[]}
     */
    getAddresses() {
        return this._contracts.map((contract) => contract.address);
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