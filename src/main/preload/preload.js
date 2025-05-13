// Use require instead of import for Electron to work with CommonJS
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
// For debugging
console.log('Preload script executed');
// Create a debug logger for troubleshooting preload script issues
const preloadLogger = {
    log: (message) => {
        console.log(`[Preload] ${message}`);
    },
    error: (message, error) => {
        console.error(`[Preload Error] ${message}`, error);
    }
};
// Log preload script execution
preloadLogger.log('Preload script starting execution');
// Safely create path utilities with error handling
const pathUtils = {
    join: (...args) => {
        try {
            return path.join(...args);
        }
        catch (err) {
            preloadLogger.error('Error in path.join', err);
            return args.filter(Boolean).join('/');
        }
    },
    resolve: (...args) => {
        try {
            return path.resolve(...args);
        }
        catch (err) {
            preloadLogger.error('Error in path.resolve', err);
            return args.filter(Boolean).join('/');
        }
    },
    dirname: (p) => {
        try {
            return path.dirname(p);
        }
        catch (err) {
            preloadLogger.error('Error in path.dirname', err);
            const lastSlashIndex = p.lastIndexOf('/');
            return lastSlashIndex === -1 ? '.' : p.slice(0, lastSlashIndex) || '/';
        }
    },
    basename: (p, ext) => {
        try {
            return path.basename(p, ext);
        }
        catch (err) {
            preloadLogger.error('Error in path.basename', err);
            let base = p.slice(p.lastIndexOf('/') + 1);
            if (ext && base.endsWith(ext)) {
                base = base.slice(0, -ext.length);
            }
            return base;
        }
    },
    extname: (p) => {
        try {
            return path.extname(p);
        }
        catch (err) {
            preloadLogger.error('Error in path.extname', err);
            const lastDotIndex = p.lastIndexOf('.');
            return lastDotIndex !== -1 ? p.slice(lastDotIndex) : '';
        }
    },
    sep: path.sep
};
// Expose a limited subset of electron and Node.js APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
    // App info
    isPackaged: process.env.NODE_ENV === 'production',
    // IPC communication with improved error handling
    send: (channel, ...args) => {
        try {
            ipcRenderer.send(channel, ...args);
        }
        catch (err) {
            preloadLogger.error(`Error sending message on channel ${channel}`, err);
        }
    },
    on: (channel, listener) => {
        try {
            // Remove any existing listeners to prevent duplicates
            ipcRenderer.removeAllListeners(channel);
            // Add the new listener with error handling
            ipcRenderer.on(channel, (_event, ...args) => {
                try {
                    listener(...args);
                }
                catch (err) {
                    preloadLogger.error(`Error in listener for channel ${channel}`, err);
                }
            });
        }
        catch (err) {
            preloadLogger.error(`Error registering listener for channel ${channel}`, err);
        }
    },
    // Node.js path module (safe subset with error handling)
    path: pathUtils,
    // File system access (limited subset)
    fs: {
        existsSync: (p) => {
            try {
                return fs.existsSync(p);
            }
            catch (err) {
                preloadLogger.error(`Error checking if path exists: ${p}`, err);
                return false;
            }
        }
    },
    // OS info (safe subset)
    os: {
        platform: () => {
            try {
                return os.platform();
            }
            catch (err) {
                preloadLogger.error('Error getting platform', err);
                return 'unknown';
            }
        },
        homedir: () => {
            try {
                return os.homedir();
            }
            catch (err) {
                preloadLogger.error('Error getting homedir', err);
                return '/';
            }
        },
        tmpdir: () => {
            try {
                return os.tmpdir();
            }
            catch (err) {
                preloadLogger.error('Error getting tmpdir', err);
                return '/tmp';
            }
        }
    },
    // File system methods through IPC
    getPath: (name) => {
        try {
            return ipcRenderer.invoke('app:get-path', name);
        }
        catch (err) {
            preloadLogger.error(`Error invoking app:get-path for ${name}`, err);
            return Promise.reject(err);
        }
    },
    readDir: (dirPath) => {
        try {
            return ipcRenderer.invoke('fs:read-dir', dirPath);
        }
        catch (err) {
            preloadLogger.error(`Error invoking fs:read-dir for ${dirPath}`, err);
            return Promise.reject(err);
        }
    },
    readFile: (filePath) => {
        try {
            return ipcRenderer.invoke('fs:read-file', filePath);
        }
        catch (err) {
            preloadLogger.error(`Error invoking fs:read-file for ${filePath}`, err);
            return Promise.reject(err);
        }
    },
    writeFile: (filePath, data) => {
        try {
            return ipcRenderer.invoke('fs:write-file', filePath, data);
        }
        catch (err) {
            preloadLogger.error(`Error invoking fs:write-file for ${filePath}`, err);
            return Promise.reject(err);
        }
    },
    // Logging
    log: (message) => {
        try {
            ipcRenderer.send('log', message);
        }
        catch (err) {
            console.error('Failed to send log to main process:', err);
        }
    },
    error: (message, error) => {
        try {
            ipcRenderer.send('error', message, error === null || error === void 0 ? void 0 : error.message, error === null || error === void 0 ? void 0 : error.stack);
        }
        catch (err) {
            console.error('Failed to send error to main process:', err);
        }
    }
});
// Also expose direct path methods to window.path (for compatibility with code expecting Node.js path)
contextBridge.exposeInMainWorld('path', pathUtils);
// Log successful initialization
preloadLogger.log('Preload script successfully initialized');
// Let the main process know when preload is ready
try {
    ipcRenderer.send('preload-ready');
}
catch (err) {
    console.error('Failed to send preload-ready event:', err);
}
//# sourceMappingURL=preload.js.map