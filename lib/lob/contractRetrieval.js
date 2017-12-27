const __web3Calls = new Set();

function logWeb3Call(contractAddress, method, args = []) {
    const argsString = Object.entries(args).map(([key, value]) => {
        if (key) {
            return key + ": " + value;
        } else {
            return value;
        }
    }).join(", ");
    const s = contractAddress + "." + method + "(" + argsString + ")";
    if (__web3Calls.has(s)) {
        console.log("Duplicate execution: " + s);
    } else {
        __web3Calls.add(s);
    }
}

function injectWeb3LogCalls(contract, abiDescription) {
    for (const method of abiDescription) {
        if (method.type !== 'function') {
            continue;
        }

        const oldMethod = contract[method.name].call;

        contract[method.name].call = function() {
            const inputs = {};
            for (let i = 0; i < method.inputs.length; i++) {
                inputs[method.inputs[i].name] = arguments[i];
            }
            logWeb3Call(this.address, method.name, inputs);
            return oldMethod.apply(this, arguments);
        }
    }
}

const __licenseContracts = {};

/**
 * @param {string} address The address of the license contract
 * @returns {*} A web3 contract object
 */
export function getLicenseContract(address) {
    if (typeof __licenseContracts[address] === 'undefined') {
        const abiDescription = [{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"balance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"reclaimableBalance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transferAndAllowReclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"}],"name":"revoke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuerName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newFee","type":"uint128"}],"name":"setFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"},{"name":"reclaimer","type":"address"}],"name":"reclaimableBalanceBy","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"signature","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerCertificate","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"originalOwner","type":"address"},{"name":"index","type":"uint256"}],"name":"addressesLicensesCanBeReclaimedFrom","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"liability","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"from","type":"address"},{"name":"amount","type":"uint64"}],"name":"reclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_signature","type":"bytes"}],"name":"sign","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"relevantIssuances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"originalOwner","type":"address"}],"name":"addressesLicensesCanBeReclaimedFromCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"relevantIssuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"certificateText","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lobRoot","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"safekeepingPeriod","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"numLicenses","type":"uint64"},{"name":"auditRemark","type":"string"},{"name":"auditTime","type":"uint32"},{"name":"initialOwner","type":"address"}],"name":"issueLicense","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"fee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"issuances","outputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"originalSupply","type":"uint64"},{"name":"auditTime","type":"uint32"},{"name":"auditRemark","type":"string"},{"name":"revoked","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_issuer","type":"address"},{"name":"_issuerName","type":"string"},{"name":"_liability","type":"string"},{"name":"_issuerCertificate","type":"bytes"},{"name":"_safekeepingPeriod","type":"uint8"},{"name":"_fee","type":"uint128"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Issuing","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"},{"indexed":false,"name":"reclaimable","type":"bool"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"}],"name":"Reclaim","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newFee","type":"uint128"}],"name":"FeeChange","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        const contract = abi.at(address, null);
        injectWeb3LogCalls(contract, abiDescription);
        __licenseContracts[address] = contract;
    }
    return __licenseContracts[address];
}

const __rootContracts = {};

/**
 * @param {string} address The address of the root contract
 * @returns {*} A web3 contract object
 */
export function getRootContract(address) {
    if (typeof __rootContracts[address] === 'undefined') {
        const abiDescription = [{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdrawFromLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"newFee","type":"uint128"}],"name":"setLicenseContractFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"defaultFee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"licenseContractCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuerName","type":"string"},{"name":"liability","type":"string"},{"name":"safekeepingPeriod","type":"uint8"},{"name":"issuerCertificate","type":"bytes"}],"name":"createLicenseContract","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newDefaultFee","type":"uint128"}],"name":"setDefaultFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"}],"name":"disableLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"licenseContracts","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"licenseContractAddress","type":"address"}],"name":"LicenseContractCreation","type":"event"},{"anonymous":false,"inputs":[],"name":"Disabled","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        const contract = abi.at(address, null);
        injectWeb3LogCalls(contract, abiDescription);
        __rootContracts[address] = contract;
    }
    return __rootContracts[address];
}