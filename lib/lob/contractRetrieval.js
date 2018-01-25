import {Settings} from "../Settings";

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
    switch (Settings.web3LoggingLevel.get()) {
        case 0: // No logging
            break;
        case 1:
            if (__web3Calls.has(s)) {
                console.log("Duplicate execution: " + s);
            }
            break;
        case 2:
            console.log(s);
    }
    __web3Calls.add(s);
}

function injectWeb3LogCalls(contract, abiDescription) {
    for (const method of abiDescription) {
        if (method.type !== 'function') {
            continue;
        }

        const oldMethod = contract[method.name];
        const oldEstimateGas = contract[method.name].estimateGas;

        contract[method.name] = function() {
            const inputs = {};
            for (let i = 0; i < method.inputs.length; i++) {
                inputs[method.inputs[i].name] = arguments[i];
            }
            logWeb3Call(this.address, method.name, inputs);
            if (Settings.web3Latency.get() > 0) {
                setTimeout(() => {
                    oldMethod.apply(this, arguments);
                }, Settings.web3Latency.get());
            } else {
                oldMethod.apply(this, arguments);
            }
        };
        contract[method.name].estimateGas = function() {
            oldEstimateGas.apply(this, arguments);
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
        const abiDescription = [{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"owner","type":"address"}],"name":"balance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"originalOwner","type":"address"},{"name":"index","type":"uint256"}],"name":"temporaryLicenseHolders","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"initialOwnerAddress","type":"address"},{"name":"numLicenses","type":"uint64"},{"name":"auditRemark","type":"string"},{"name":"auditTime","type":"uint32"}],"name":"issueLicense","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"newFee","type":"uint128"}],"name":"setIssuanceFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"owner","type":"address"}],"name":"temporaryBalance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"signature","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuanceFee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_managerAddress","type":"address"}],"name":"takeOverManagementControl","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"liability","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"from","type":"address"},{"name":"amount","type":"uint64"}],"name":"reclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_signature","type":"bytes"}],"name":"sign","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"relevantIssuances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerSSLCertificate","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"originalOwner","type":"address"}],"name":"temporaryLicenseHoldersCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"relevantIssuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"owner","type":"address"},{"name":"reclaimer","type":"address"}],"name":"temporaryBalanceReclaimableBy","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"certificateText","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lobRoot","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"safekeepingPeriod","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"managerAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"issuances","outputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalSupply","type":"uint64"},{"name":"auditTime","type":"uint32"},{"name":"auditRemark","type":"string"},{"name":"revoked","type":"bool"},{"name":"revocationReason","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuancesCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"revocationReason","type":"string"}],"name":"revoke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceNumber","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transferTemporarily","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_issuer","type":"address"},{"name":"_issuerName","type":"string"},{"name":"_liability","type":"string"},{"name":"_safekeepingPeriod","type":"uint8"},{"name":"_issuerSSLCertificate","type":"bytes"},{"name":"_issuanceFee","type":"uint128"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceNumber","type":"uint256"}],"name":"Issuing","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"issuanceNumber","type":"uint256"},{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"},{"indexed":false,"name":"temporary","type":"bool"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"issuanceNumber","type":"uint256"},{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"}],"name":"Reclaim","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"issuanceNumber","type":"uint256"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newFee","type":"uint128"}],"name":"IssuanceFeeChange","type":"event"},{"anonymous":false,"inputs":[],"name":"Signing","type":"event"},{"anonymous":false,"inputs":[],"name":"Disabling","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"managerAddress","type":"address"}],"name":"ManagementControlTakeOver","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        const contract = abi.at(address, null);
        if (Settings.web3LoggingLevel.get() > 0 || Settings.web3Latency.get() > 0) {
            injectWeb3LogCalls(contract, abiDescription);
        }
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
        const abiDescription = [{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"newFee","type":"uint128"}],"name":"setLicenseContractIssuanceFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newDefaultFee","type":"uint128"}],"name":"setDefaultIssuanceFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdrawFromLicenseContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"licenseContractCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuerName","type":"string"},{"name":"liability","type":"string"},{"name":"safekeepingPeriod","type":"uint8"},{"name":"issuerSSLCertificate","type":"bytes"}],"name":"createLicenseContract","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"licenseContractAddress","type":"address"},{"name":"managerAddress","type":"address"}],"name":"takeOverLicenseContractControl","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"defaultIssuanceFee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"licenseContracts","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"licenseContractAddress","type":"address"}],"name":"LicenseContractCreation","type":"event"},{"anonymous":false,"inputs":[],"name":"Disabling","type":"event"}];
        const abi = web3.eth.contract(abiDescription);
        const contract = abi.at(address, null);
        if (Settings.web3LoggingLevel.get() > 0) {
            injectWeb3LogCalls(contract, abiDescription);
        }
        __rootContracts[address] = contract;
    }
    return __rootContracts[address];
}