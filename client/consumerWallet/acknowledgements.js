export const Acknowledgements = {
    show() {
        EthElements.Modal.show({
            template: 'acknowledgements',
            class: 'mediumModal'
        });
    }
};


Template.acknowledgements.events({
    'click button.hideModal'() {
        EthElements.Modal.hide();
    },
});