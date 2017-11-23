export class PersistentReactiveVar extends ReactiveVar {
    constructor(localStorageKey, initialValueTransform = (x) => x) {
        const value = initialValueTransform(window.localStorage.getItem(localStorageKey));
        super(value);
        this.localStorageKey = localStorageKey;
    }

    set(newValue) {
        super.set(newValue);
        window.localStorage.setItem(this.localStorageKey, newValue);
    }
}