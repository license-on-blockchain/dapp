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