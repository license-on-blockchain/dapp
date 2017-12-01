export class LazyReactiveVar extends ReactiveVar {
    constructor(defaultValue, resolve) {
        super(undefined);
        this.defaultValue = defaultValue;
        this.resolve = resolve;
        this.resolving = false;
    }

    get() {
        const value = super.get();
        if (typeof value === 'undefined') {
            if (!this.resolving) {
                this.resolving = true;
                this.resolve((value) => {
                    this.set(value);
                });
            }
            return this.defaultValue;
        }
        return value;
    }
}