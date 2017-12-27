import {handleUnknownEthereumError} from "./ErrorHandling";

/**
 * @param {function(Array)} callback
 */
export function getAccounts(callback) {
    web3.eth.getAccounts((error, accounts) => {
        if (error) { handleUnknownEthereumError(error); return; }
        callback(accounts);
    });
}