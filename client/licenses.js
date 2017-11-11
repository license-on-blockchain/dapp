function getLicenseContract(address) {
    const abiDescription = [{"constant":false,"inputs":[{"name":"amount","type":"uint256"},{"name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"balance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"}],"name":"reclaimableBalance","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transferAndAllowReclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"}],"name":"revoke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issuerName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"disable","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newFee","type":"uint128"}],"name":"setFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"owner","type":"address"},{"name":"reclaimer","type":"address"}],"name":"reclaimableBalanceBy","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"amount","type":"uint64"}],"name":"destroy","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"signature","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"issuerCertificate","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"liability","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"from","type":"address"},{"name":"amount","type":"uint64"}],"name":"reclaim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_signature","type":"bytes"}],"name":"sign","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"issuanceID","type":"uint256"},{"name":"to","type":"address"},{"name":"amount","type":"uint64"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"certificateText","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lobRoot","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newRoot","type":"address"}],"name":"setLOBRoot","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"safekeepingPeriod","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"numLicenses","type":"uint64"},{"name":"auditRemark","type":"string"},{"name":"auditTime","type":"uint32"},{"name":"initialOwner","type":"address"}],"name":"issueLicense","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"fee","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"issuances","outputs":[{"name":"description","type":"string"},{"name":"code","type":"string"},{"name":"originalOwner","type":"string"},{"name":"originalSupply","type":"uint64"},{"name":"auditTime","type":"uint32"},{"name":"auditRemark","type":"string"},{"name":"revoked","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"disabled","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_issuer","type":"address"},{"name":"_issuerName","type":"string"},{"name":"_liability","type":"string"},{"name":"_issuerCertificate","type":"bytes"},{"name":"_safekeepingPeriod","type":"uint8"},{"name":"_fee","type":"uint128"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Issuing","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"},{"indexed":false,"name":"reclaimable","type":"bool"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint64"}],"name":"Reclaim","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"issuanceID","type":"uint256"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newRoot","type":"address"}],"name":"LOBRootChange","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newFee","type":"uint128"}],"name":"FeeChange","type":"event"}];
    const abi = web3.eth.contract(abiDescription);
    return abi.at(address);
}

class Issuance {
    constructor(array) {
        this.description = array[0];
        this.code = array[1];
        this.originalOwner = array[2];
        this.originalSupply = array[3];
        this.auditTime = array[4];
        this.auditRemark = array[5];
        this.revoked = array[6];
    }
}

class ReactiveMap extends ReactiveVar {
    constructor(defaultValueConstructor = () => undefined) {
        super({});
        this.defaultValue = defaultValueConstructor;
    }

    hasKey(key) {
        return typeof super.get()[key] !== 'undefined';
    }

    getKey(key) {
        let value = super.get()[key];
        if (typeof value === 'undefined') {
            value = this.defaultValue();
        }
        return value;
    }

    setKey(key, value) {
        const obj = super.get();
        obj[key] = value;
        super.set(obj);
    }

    updateKey(key, updateFunction) {
        const oldValue = this.getKey(key);
        const newValue = updateFunction(oldValue);
        this.setKey(key, newValue);
    }
}

BigNumber.zero = new BigNumber(0);

const accounts = ["0xb5113f810deF920893E82C9A666B599bc31e5446".toLowerCase()];//web3.eth.accounts

const issuances = new ReactiveMap(() => {
    return {
        balance: new ReactiveMap(),
    };
});

function handleUnknownEthereumError(error) {
    // TODO: Do something more sophisticated here
    debugger;
    alert(error);
}

function addLicenseContract(contractAddress) {
    contractAddress = contractAddress.toLowerCase();
    const licenseContract = getLicenseContract(contractAddress);

    // TODO: Add method to smart contract to get number of issuings
    const numIssuances = 10;

    for (let issuanceID = 0; issuanceID < numIssuances; issuanceID++) {
        addIssuance(licenseContract, issuanceID);
    }
    licenseContract.Issuing({}, {fromBlock: 'latest'}).watch((error, issuing) => {
        if (error) { handleUnknownEthereumError(error); return; }

        addIssuance(licenseContract, issuing.args.issuanceID);
    });

    // Listen for balance updates
    licenseContract.Transfer({}, {fromBlock: 'latest'}).watch(function(error, transfer) {
        for (const address of [transfer.args.from, transfer.args.to]) {
            if (accounts.indexOf(address) !== -1) { // Ignore if it doesn't affect us
                updateLOBBalanceForAccount(licenseContract, transfer.args.issuanceID.toNumber(), address);
            }
        }
    });

    // Listen for updates to the revoked status
    licenseContract.Revoke({}, {fromBlock: 'latest'}).watch((error, revoke) => {
        const issuanceID = revoke.args.issuanceID.toNumber();
        if (issuances.hasKey(issuanceID)) {
            issuances.getKey(issuanceID).revoked.set(true);
        }
    });
}

function addIssuance(licenseContract, issuanceID) {
    // Retrieve initial balances. If a balance is non-zero and metadata is missing, metadata will be retrieved
    for (const address of accounts) {
        updateLOBBalanceForAccount(licenseContract, issuanceID, address);
    }
}

function addIssuanceMetadata(licenseContract, issuanceID) {
    licenseContract.issuances(issuanceID, (error, value) => {
        if (error) { handleUnknownEthereumError(error); return; }

        // Update issuance metadata
        const issuanceObj = new Issuance(value);
        issuances.updateKey(issuanceID, (issuance) => {
            issuance.issuanceID = issuanceID;
            issuance.description = issuanceObj.description;
            issuance.code = issuanceObj.code;
            issuance.originalOwner = issuanceObj.originalOwner;
            issuance.originalSupply = issuanceObj.originalSupply;
            issuance.auditTime = issuanceObj.auditTime;
            issuance.auditRemark = issuanceObj.auditRemark;
            issuance.revoked = new ReactiveVar(issuanceObj.revoked);
            return issuance;
        });
    });
}

function updateLOBBalanceForAccount(licenseContract, issuanceID, accountAddress) {
    licenseContract.balance(issuanceID, accountAddress, (error, balance) => {
        if (error) { handleUnknownEthereumError(error); return; }

        if (!issuances.hasKey(issuanceID) && balance.isZero()) {
            // Don't add an entry if balance is zero
            return;
        }

        issuances.updateKey(issuanceID, (issuance) => {
            issuance.balance.setKey(accountAddress, balance);
            return issuance;
        });

        if (!balance.isZero()) {
            if (typeof issuances.getKey(issuanceID).issuanceID === 'undefined') {
                addIssuanceMetadata(licenseContract, issuanceID);
            }
        }
    });
}

Template.licenses.onCreated(function() {
    // TODO: Add all license contract created by root contracts and watch for new license contracts
    addLicenseContract("0xfD8F3a53e8445c19155d1E4d044C0A77EE6AEbef");
});

Template.licenses.helpers({
    licenses() {
        return Object.values(issuances.get());
    }
});

Template.licenseRow.helpers({
    revoked() {
        return this.revoked.get();
    },
    balance() {
        // Compute total balance
        return Object.values(this.balance.get()).reduce((a, b) => a.plus(b), BigNumber.zero).toString();
    }
});