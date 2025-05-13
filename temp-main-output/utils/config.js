"use strict";
// src/utils/config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.rendererConfig = exports.config = void 0;
// For main process
const dotenv = require("dotenv");
// Import based on environment to handle both main and renderer processes
let path;
let electron;
let app;
// Function to initialize modules without top-level await
function initModules() {
    if (typeof process !== 'undefined' && process.type !== 'renderer') {
        try {
            // In the main process, use require for Node.js modules
            const pathModule = require('path');
            path = pathModule;
            const electronModule = require('electron');
            electron = electronModule;
            app = electron.app;
        }
        catch (e) {
            console.error('Failed to load Node.js modules in main process:', e);
            // Fallback to browser-compatible versions
            path = { join: (...args) => args.join('/') };
            app = { getPath: () => '' };
        }
    }
    else {
        // In the renderer process, don't try to access node modules directly
        path = { join: (...args) => args.join('/') };
        app = { getPath: () => '' };
    }
}
// Initialize modules
initModules();
// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${environment}` });
exports.config = {
    apiUrl: process.env.API_URL || 'http://localhost:5173',
    modelStoragePath: process.env.MODEL_STORAGE_PATH ||
        (app.getPath ? path.join(app.getPath('userData'), 'models') : 'models'),
    debugMode: process.env.DEBUG_MODE === 'true'
};
// Simple in-memory store as a fallback
const memoryStore = {
    // Default logging configuration
    loggingLevels: {
        assets: 'normal', // Default to normal logging
        models: 'normal'
    }
};
// Create a simple store implementation that doesn't rely on electron-store
const store = {
    get: (key) => {
        // Try to get from localStorage in renderer process
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const value = window.localStorage.getItem(`config_${key}`);
                return value ? JSON.parse(value) : null;
            }
            catch (e) {
                console.error('Error reading from localStorage:', e);
            }
        }
        // Fallback to memory store
        return memoryStore[key] || null;
    },
    set: (key, value) => {
        // Store in localStorage in renderer process
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem(`config_${key}`, JSON.stringify(value));
            }
            catch (e) {
                console.error('Error writing to localStorage:', e);
            }
        }
        // Always store in memory
        memoryStore[key] = value;
    }
};
exports.rendererConfig = {
    getApiUrl: () => {
        return store.get('apiUrl');
    },
    getTheme: () => {
        const theme = store.get('theme');
        return theme === 'light' || theme === 'dark' ? theme : 'light';
    },
    setTheme: (theme) => {
        store.set('theme', theme);
    },
    // Asset and model logging configuration
    getLoggingLevel: (category) => {
        const loggingLevels = store.get('loggingLevels') || {};
        const level = loggingLevels[category];
        // Return valid logging levels only, default to 'normal'
        return (level === 'verbose' || level === 'normal' || level === 'quiet')
            ? level
            : 'normal';
    },
    setLoggingLevel: (category, level) => {
        const loggingLevels = store.get('loggingLevels') || {};
        loggingLevels[category] = level;
        store.set('loggingLevels', loggingLevels);
    }
};
