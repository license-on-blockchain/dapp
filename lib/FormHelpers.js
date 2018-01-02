export function resetErrors() {
    this.$('.dapp-error').removeClass('dapp-error');
    this.$('.lob-error-message').html("");
}

/**
 *
 * @param {string} fieldName
 * @param {boolean|function} validation
 * @param {boolean} enableValidation
 * @param {string|null} errorMessage
 * @param {Array|null} errorMessagesAccumulation
 * @return {boolean}
 */
export function validateField(fieldName, validation, enableValidation, errorMessage, errorMessagesAccumulation = null) {
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
                if (errorMessagesAccumulation) {
                    errorMessagesAccumulation.push(errorMessage);
                }
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