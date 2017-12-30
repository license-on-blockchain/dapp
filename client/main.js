import {Template} from 'meteor/templating';
import {lob} from "../lib/LOB";
import {Settings} from "../lib/Settings";
import {rootContracts} from "../lib/RootContracts";
import './main.html';

Router.route('/', function () {
    this.render('licenses');
});

Router.route('/licenses', function() {
    this.render('licenses');
}, {
    name: 'licenses'
});

// Transfer
Router.route('/transfer');
Router.route('/transfer/from/:from/licenseContract/:licenseContract/issuance/:issuance', function () {
    this.render('transfer', {
        data: {
            licenseContract: this.params.licenseContract,
            issuanceID: this.params.issuance,
            from: this.params.from,
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

// Reclaim
Router.route('/reclaim');

// Settings
Router.route('/settings');

Router.route('/licensecontracts', function() {
    this.render('managedLicenseContractList');
}, {
    name: 'licensecontracts'
});

Router.route('/licensecontracts/:address', function() {
    this.render('manageLicenseContract', {
        data: {
            address: this.params.address
        }
    })
}, {
    name: 'manageLicenseContract'
});

Router.route('/licensecontracts/create', function() {
    this.render('createLicenseContract');
});

Router.route('/licensecontracts/waitforcreationmining/:rootContract/:transactionHash', function() {
    this.render('waitForContractCreationMining', {
        data: {
            rootContract: this.params.rootContract,
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
    // TODO: Hack: Allow PersistentMinimongo2 to load values from storage
    setTimeout(() => {
        for (const rootContractAddress of Object.keys(rootContracts)) {
            lob.watchRootContract(rootContractAddress);
        }
    }, 0);
});

Meteor.startup(function() {
    TAPi18n.setLanguage(Settings.language.get());
});