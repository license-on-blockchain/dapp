import { Template } from 'meteor/templating';
import { lob } from "../lib/LOB";

import './main.html';

Router.route('/', function () {
    this.render('licenses');
});

Router.route('/licenses');
Router.route('/send');

Template.body.helpers({
    activeIfCurrentRoute(name) {
        let currentRoute;
        if (Router.current()) {
            currentRoute = Router.current().route.getName();
        } else {
            currentRoute = 'licenses';
        }
        return currentRoute === name ? 'active' : '';
    },
});

Template.body.onCreated(function() {
    // TODO: Add all license contract created by root contracts and watch for new license contracts
    lob.watchLicenseContract("0xfD8F3a53e8445c19155d1E4d044C0A77EE6AEbef");
});