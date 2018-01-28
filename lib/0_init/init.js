import {Settings} from "../Settings";

if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
}


Meteor.startup(function() {
    if (Meteor.isClient) {
        if (Settings.trackerRunDebugging.get()) {
            let trackerRunCounter = 0;

            const oldFunction = Tracker.autorun;
            Tracker.autorun = function() {
                const oldClosure = arguments[0];
                arguments[0] = function() {
                    trackerRunCounter++;
                    if (trackerRunCounter === 1000) {
                        console.warn(trackerRunCounter + " tracker runs in the last second");
                    }
                    oldClosure.apply(this, arguments);
                };
                return oldFunction.apply(this, arguments);
            };

            setInterval(function() {
                trackerRunCounter = 0;
            }, 1000);
        }
    }
});