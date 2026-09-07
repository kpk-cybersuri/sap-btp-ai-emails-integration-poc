// const express = require('express');
const asyncLocalStorage = require('./lib/tc-context');
const { logBooleanState, toggleFlag } = require('./lib/tc-utils');
const cds = require('@sap/cds');

class TestCheckService extends cds.ApplicationService {

    init() {
        this.on('testCheck', this.tcHandler);
        return super.init();
    }

    async tcHandler() {
        return asyncLocalStorage.run(
            {
                myFlag: true
            },
            async () => {
                logBooleanState();
                toggleFlag();
                logBooleanState();

                return 'Done from Function';
            }
        );
    }
}

module.exports = TestCheckService;
