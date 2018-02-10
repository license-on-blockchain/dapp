export const SSLCertificateRevokeCheck = {
    show(sslCertificate) {
        EthElements.Modal.show({
            template: 'sslCertificateRevokeCheck',
            data: {
                sslCertificate: sslCertificate
            },
            class: 'mediumModal'
        });
    }
};

Template.sslCertificateRevokeCheck.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});