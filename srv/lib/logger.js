// srv/common/logger.js

const logStore = new WeakMap();

function isDevEnv(enforceLogging = false) {
    if (enforceLogging)
        return true;
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' || env === 'test';
}

function shouldAccumulate(req) {
    return req?.data?.getLogs === true || req?.query?.getLogs === 'true';
}

function startCapture(req) {
    if (shouldAccumulate(req)) {
        logStore.set(req, []);
    }
}

function accumulate(req, message, level = 'log') {
    if (!logStore.has(req)) return;

    const logEntry = `[${level.toUpperCase()}] ${new Date().toISOString()} - ${message}`;
    logStore.get(req).push(logEntry);
}

function getLogs(req) {
    return logStore.get(req)?.join('\n') || '';
}

function log(message, req) {
    if (isDevEnv()) {
        console.log(message);
    } else if (shouldAccumulate(req)) {
        accumulate(req, message, 'log');
    }
}

function warn(message, req) {
    if (isDevEnv()) {
        console.warn(message);
    } else if (shouldAccumulate(req)) {
        accumulate(req, message, 'warn');
    }
}

function error(message, req) {
    if (isDevEnv()) {
        console.error(message);
    } else if (shouldAccumulate(req)) {
        accumulate(req, message, 'error');
    }
}

module.exports = {
    log,
    warn,
    error,
    startCapture,
    getLogs
};

