import { Template } from 'meteor/templating';
import { lob } from "../lib/LOB";

import './main.html';

Router.route('/', function () {
    this.render('licenses');
});

Router.route('/licenses');
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

Template.body.helpers({
    activeIfCurrentRoute(name) {
        let currentRoute;
        if (Router.current()) {
            currentRoute = Router.current().route.getName();
            if (currentRoute.indexOf('.') !== -1) {
                currentRoute = currentRoute.substring(0, currentRoute.indexOf('.'));
            }
        } else {
            currentRoute = 'licenses';
        }
        return currentRoute === name ? 'active' : '';
    },
});

Template.body.onCreated(function() {
    // TODO: Add all license contract created by root contracts and watch for new license contracts
    lob.watchLicenseContract("0x1187478417CE9CD5cdF2b5686E9783d004786E25");
});