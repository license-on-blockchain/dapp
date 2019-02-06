const DURATION = 4; // seconds

export class NotificationCenter {
    static showError(message) {
        if (typeof message === 'object' && message.code === -32603) {
            message = TAPi18n.__('generic.signature_rejected_through_metamask')
        }
        if (typeof message === 'object' && message.message) {
            message = message.message;
        }
        if (message.indexOf("MetaMask Tx Signature: User denied transaction signature.") !== -1 || // Error message in Chrome
            message.indexOf("setTxStatusRejected") !== -1) { // Error message in Firefox
            message = TAPi18n.__('generic.transaction_rejected_through_metamask');
        }
        GlobalNotification.error({
            content: String(message),
            duration: DURATION
        });
    }

    static showSuccess(message) {
        GlobalNotification.success({
            content: message,
            duration: DURATION
        });
    }

    static showTransactionSubmitted() {
        this.showSuccess(TAPi18n.__('generic.transaction_successfully_submitted'));
    }
}
