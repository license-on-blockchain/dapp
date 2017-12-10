export function resetErrors() {
    this.$('.dapp-error').removeClass('dapp-error');
    this.$('.lob-error-message').html("");
}

export function validateField(fieldName, validation, enableValidation, errorMessage) {
    if (enableValidation) {
        let validationResult;
        if (typeof validation === 'function') {
            try {
                validationResult = validation();
            } catch (error) {
                validationResult = false;
                errorMessage = error;
            }
        } else {
            validationResult = validation;
        }

        if (!validationResult) {
            this.$('[name=' + fieldName + ']').addClass('dapp-error');
            if (errorMessage) {
                this.$('.lob-error-message[data-for=' + fieldName + ']').html(errorMessage);
            }
            return false;
        } else {
            return true;
        }
    } else {
        return true;
    }
}