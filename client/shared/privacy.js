Template.privacy_de.helpers({
    currentURL() {
        return window.location.protocol + '//' + window.location.host + Iron.Location.get().path;
    }
});
