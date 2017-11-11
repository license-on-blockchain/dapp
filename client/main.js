import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

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