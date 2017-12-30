import forge from 'node-forge';

export function promisify(inner) {
    return new Promise((resolve, reject) =>
        inner((error, result) => {
            if (error) {
                reject(error);
            }

            resolve(result);
        })
    );
}

/**
 * Convert a hex-representation of data into a binary string, properly handling a '0x' prefix
 * @param {string} hex The hex representation of the data
 * @returns {string} The binary representation of the same data
 */
export function hexToBytes(hex) {
    if (hex.startsWith("0x")) {
        hex = hex.substr(2);
    }
    return forge.util.hexToBytes(hex);
}

/**
 * @param {Date} date
 * @return {string}
 */
export function formatDate(date) {
    return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
}
