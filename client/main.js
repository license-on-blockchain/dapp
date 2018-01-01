import {Template} from 'meteor/templating';
import {lob} from "../lib/LOB";
import {Settings} from "../lib/Settings";
import {RootContracts} from "../lib/RootContracts";
import './main.html';
import {PersistentCollections} from "../lib/PersistentCollections";

Router.route('/', function () {
    this.render('licenses');
});

Router.route('/licenses', function() {
    this.render('licenses');
}, {
    name: 'licenses'
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
            issuanceID: this.params.issuance,
            from: this.params.from,
        }
    });
});
Router.route('/transfer/from/:from/licenseContract/:licenseContract/issuance/:issuance/amount/:amount', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceID: this.params.issuance,
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
            issuanceID: this.params.issuance,
            from: this.params.from,
            destroy: true
        }
    });
});
Router.route('/destroy/from/:from/licenseContract/:licenseContract/issuance/:issuance/amount/:amount', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceID: this.params.issuance,
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
            issuanceID: this.params.issuance,
            from: this.params.from,
            allowReclaim: true
        }
    });
});
Router.route('/transferreclaim/from/:from/licenseContract/:licenseContract/issuance/:issuance/amount/:amount', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceID: this.params.issuance,
            from: this.params.from,
            amount: this.params.amount,
            allowReclaim: true,
        }
    });
});

// Reclaim
Router.route('/reclaim');

// Settings
Router.route('/settings');

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
});

Router.route('/licensecontracts/revoke/:licenseContractAddress/:issuanceID', function() {
    this.render('revokeIssuance', {
        data: {
            licenseContract: this.params.licenseContractAddress,
            issuanceID: this.params.issuanceID,
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


Template.body.helpers({
    activeIfCurrentRoute(name) {
        let currentRoute;
        if (Router.current() && Router.current().route.getName()) {
            currentRoute = Router.current().route.getName();
            if (currentRoute.indexOf('.') !== -1) {
                currentRoute = currentRoute.substring(0, currentRoute.indexOf('.'));
            }
        } else {
            currentRoute = 'licenses';
        }
        return currentRoute === name ? 'active' : '';
    },
    enableInstallation() {
        return Settings.enableInstallation.get();
    },
    enableIssuerActions() {
        return Settings.enableIssuerActions.get();
    }
});

Template.body.onCreated(function() {
    PersistentCollections.afterAllInitialisations(() => {
        for (const rootContractAddress of RootContracts.getAddresses()) {
            lob.watchRootContract(rootContractAddress);
        }
    });
});

Meteor.startup(function() {

    if (Meteor.isClient) {
        EthAccounts.init();
        EthBlocks.init();
        Tracker.autorun(() => {
            TAPi18n.setLanguage(Settings.language.get()).fail((error) => {
                console.error(error)
            });
        });
    }
});