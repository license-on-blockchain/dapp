export const RootContracts = {
    /**
     * For each root contract get an object of the format `{address, name}`
     * @return {object[]}
     */
    getAddressesAndNames() {
        return this._contracts;
    },

    /**
     * Get the addresses of all root contracts
     * @return {string[]}
     */
    getAddresses() {
        return this._contracts.map((contract) => contract.address);
    }
};

RootContracts._contracts = [
    {
        address: "0x1ce71cEe61f4090b020CD920FD4546dC7ad18e1F".toLowerCase(),
        name: "Local"
    },
    {
        address: "0xd007097E6b805be5E385fB8eE3798aefc3f2061A".toLowerCase(),
        name: "Ropsten"
    }
];