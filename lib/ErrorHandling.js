import {NotificationCenter} from "./NotificationCenter";

export function handleUnknownEthereumError(error) {
    NotificationCenter.showError(error);
    console.error(error);
}

export function handleUnknownMarketplaceError(error) {
    NotificationCenter.showError(error);
    console.error(error);
}