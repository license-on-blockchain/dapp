export const Cookie = {
    read(cookieName) {
        let i, x, y, ARRcookies = document.cookie.split(';');
        for (i = 0; i < ARRcookies.length; i++) {
            x = ARRcookies[i].substr(0, ARRcookies[i].indexOf('='));
            y = ARRcookies[i].substr(ARRcookies[i].indexOf('=') + 1);
            x = x.replace(/^\s+|\s+$/g, '');
            if (x === cookieName) {
                return decodeURIComponent(y.replace(/\+/g, ' '));
            }
        }
        return null;
    },
    set(cookieName, value, expirationDate) {
        if (value === null) {
            // Delete cookie
            document.cookie = cookieName + '=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        } else {
            // Write cookie
            let cookieValue = encodeURIComponent(value);
            if (typeof expirationDate === 'undefined') {
                //noinspection JSValidateTypes
                document.cookie = cookieName + "=" + cookieValue + '; path=/';
            } else {
                document.cookie = cookieName + "=" + cookieValue + '; path=/; expires=' + expirationDate.toUTCString();
            }
        }
    }
};
