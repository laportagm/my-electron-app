"use strict";
/**
 * Simplified logger for the prototype version
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.handleError = handleError;
exports.logger = {
    info: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} › ${message}`, ...args);
    },
    warn: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.warn(`${timestamp} › ${message}`, ...args);
    },
    error: (message, error) => {
        const timestamp = new Date().toISOString();
        console.error(`${timestamp} › ${message}`, error || '');
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.debug(`${timestamp} › ${message}`, ...args);
        }
    }
};
/**
 * Handle errors in a consistent way
 */
function handleError(error, context) {
    exports.logger.error(`${context}: ${error.message}`);
    if (error.stack) {
        exports.logger.debug(error.stack);
    }
}
