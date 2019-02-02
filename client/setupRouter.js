Router.route('/', function () {
    this.render('licenses');
});

Router.route('/licenses', function() {
    this.render('licenses');
}, {
    name: 'licenses'
});

Router.route('/balance/', function() {
    this.render('balance', {
        data: {}
    })
});


Router.route('/balance/:address', function() {
   this.render('balance', {
       data: {
           address: this.params.address.toLowerCase()
       }
   })
});

// Transfer
Router.route('/transfer', function() {
    this.render('transfer', {
        data: {}
    });
});
Router.route('/transfer/from/:from/licenseContract/:licenseContract/issuance/:issuance', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            from: this.params.from,
        }
    });
});
Router.route('/transfer/from/:from/licenseContract/:licenseContract/issuance/:issuance/amount/:amount', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            from: this.params.from,
            amount: this.params.amount,
        }
    });
});

// Destroy
Router.route('/destroy', function () {
    this.render('transfer', {
        data: {
            destroy: true
        }
    });
});
Router.route('/destroy/from/:from/licenseContract/:licenseContract/issuance/:issuance', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            from: this.params.from,
            destroy: true
        }
    });
});
Router.route('/destroy/from/:from/licenseContract/:licenseContract/issuance/:issuance/amount/:amount', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            from: this.params.from,
            amount: this.params.amount,
            destroy: true
        }
    });
});

// Transfer and allow reclaim
Router.route('/transferreclaim', function () {
    this.render('transfer', {
        data: {
            allowReclaim: true
        }
    });
});
Router.route('/transferreclaim/from/:from/licenseContract/:licenseContract/issuance/:issuance', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            from: this.params.from,
            allowReclaim: true
        }
    });
});
Router.route('/transferreclaim/from/:from/licenseContract/:licenseContract/issuance/:issuance/amount/:amount', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            from: this.params.from,
            amount: this.params.amount,
            allowReclaim: true,
        }
    });
});

// Reclaim
Router.route('/reclaim', function() {
    this.render('reclaim', {
        data: {}
    });
});

Router.route('/reclaim/reclaimer/:reclaimer/licenseContract/:licenseContract/issuance/:issuance', function() {
    this.render('reclaim', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceNumber: this.params.issuance,
            reclaimer: this.params.reclaimer
        }
    });
});

// Settings
Router.route('/settings', function() {
    this.render('settings', {
        data: {
            advanced: false
        }
    })
});

Router.route('/settings/advanced', function() {
    this.render('settings', {
        data: {
            advanced: true
        }
    })
});

Router.route('/licensecontracts', function() {
    this.render('managedLicenseContractList');
}, {
    name: 'licensecontracts'
});

Router.route('/licensecontracts/create', function() {
    this.render('createLicenseContract');
}, {
    name: 'licensecontracts.create'
});

Router.route('/licensecontracts/waitforcreationmining/:transactionHash', function() {
    this.render('waitForContractCreationMining', {
        data: {
            transactionHash: this.params.transactionHash
        }
    });
}, {
    name: 'licensecontracts.waitforcreationmining'
});

Router.route('/licensecontracts/sign', function () {
    this.render('signLicenseContract');
});

Router.route('/licensecontracts/sign/:licenseContractAddress', function() {
    this.render('signLicenseContract', {
        data: {
            licenseContractAddress: this.params.licenseContractAddress
        }
    });
}, {
    name: 'licensecontracts.sign.withAddress'
});

Router.route('/licensecontracts/issue', function() {
    this.render('issueLicense')
});

Router.route('/licensecontracts/issue/:licenseContractAddress', function() {
    this.render('issueLicense', {
        data: {
            licenseContractAddress: this.params.licenseContractAddress
        }
    });
}, {
    name: 'licensecontracts.issue.withAddress'
});

Router.route('/licensecontracts/revoke/:licenseContractAddress/:issuanceNumber', function() {
    this.render('revokeIssuance', {
        data: {
            licenseContract: this.params.licenseContractAddress,
            issuanceNumber: this.params.issuanceNumber,
        }
    })
});

Router.route('/licensecontracts/manage/:address', function() {
    this.render('manageLicenseContract', {
        data: {
            address: this.params.address
        }
    })
}, {
    name: 'manageLicenseContract'
});

Router.route('/licensecontracts/disable/:address', function() {
    this.render('disableLicenseContract', {
        data: {
            address: this.params.address
        }
    })
}, {
    name: 'licenseContract.disable'
});

Router.route('/browsercheck', function() {
    this.render('browsercheck');
}, {
    name: 'browsercheck'
});

// Marketplace

Router.route('/marketplace/offer/:licenseContractAddress/:issuanceNumber', function() {
    this.render('offerForSale', {
        data: {
            licenseContract: this.params.licenseContractAddress,
            issuanceNumber: this.params.issuanceNumber,
        }
    })
});