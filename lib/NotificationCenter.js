const DURATION = 4; // seconds

export class NotificationCenter {
    static showError(message) {
        if (typeof message === 'object' && message.message) {
            message = message.message;
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
