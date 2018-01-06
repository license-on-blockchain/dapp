export const InitialLoadingStatus = {
    hasFinishedLoading() {
        return this._status.get();
    },

    setHasFinishedLoading(value) {
        this._status.set(value);
    }
};

InitialLoadingStatus._status = new ReactiveVar();