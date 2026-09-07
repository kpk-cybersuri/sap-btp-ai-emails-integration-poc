const asyncLocalStorage = require('./tc-context');

function logBooleanState() {
    const store = asyncLocalStorage.getStore();
    console.log('Boolean state:', store?.myFlag);
}

function toggleFlag() {
    const store = asyncLocalStorage.getStore();
    if (store) {
        store.myFlag = !store.myFlag;
    }
}

module.exports = { logBooleanState, toggleFlag };
