const DURATION = 4; // seconds

export class NotificationCenter {
    static showError(message) {
        GlobalNotification.error({
            content: message,
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
