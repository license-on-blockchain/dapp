export class ReactiveMap extends ReactiveVar {
    constructor(defaultValueConstructor = () => undefined) {
        super({});
        this.defaultValue = defaultValueConstructor;
    }

    hasKey(key) {
        return typeof super.get()[key] !== 'undefined';
    }

    getKey(key) {
        let value = super.get()[key];
        if (typeof value === 'undefined') {
            value = this.defaultValue();
        }
        return value;
    }

    setKey(key, value) {
        const obj = super.get();
        obj[key] = value;
        super.set(obj);
    }

    updateKey(key, updateFunction) {
        const oldValue = this.getKey(key);
        const newValue = updateFunction(oldValue);
        this.setKey(key, newValue);
    }
}
