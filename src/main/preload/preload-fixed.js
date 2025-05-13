"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/main/preload/preload-fixed.ts
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
// Expose protected Node.js APIs to the renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    // File system operations
    readFile: (filePath) => electron_1.ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath, data) => electron_1.ipcRenderer.invoke('fs:write-file', filePath, data),
    readDir: (dirPath) => electron_1.ipcRenderer.invoke('fs:read-dir', dirPath),
    // App paths
    getPath: (name) => electron_1.ipcRenderer.invoke('app:get-path', name),
    // Logging
    log: (message) => electron_1.ipcRenderer.send('log', message),
    error: (message, error) => electron_1.ipcRenderer.send('error', message, error === null || error === void 0 ? void 0 : error.message, error === null || error === void 0 ? void 0 : error.stack),
    // Path utilities - expose safe wrappers around Node's path module
    path: {
        join: (...args) => path.join(...args),
        resolve: (...args) => path.resolve(...args),
        dirname: (p) => path.dirname(p),
        basename: (p, ext) => path.basename(p, ext),
        extname: (p) => path.extname(p),
        sep: path.sep
    },
    // File system access (limited subset) - required for tests
    fs: {
        existsSync: (p) => fs.existsSync(p)
    },
    // OS info (safe subset) - required for tests
    os: {
        platform: () => os.platform(),
        homedir: () => os.homedir(),
        tmpdir: () => os.tmpdir()
    },
    // Send events to main process
    send: (channel, ...args) => {
        // Whitelist channels for security
        const validChannels = ['log', 'error', 'app-ready'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.send(channel, ...args);
        }
    },
    // Receive events from main process
    on: (channel, func) => {
        // Whitelist channels for security
        const validChannels = ['app-event', 'update-available', 'model-loaded'];
        if (validChannels.includes(channel)) {
            // Remove duplicated listeners
            electron_1.ipcRenderer.removeAllListeners(channel);
            // Add the new listener
            electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});
// Let the main process know when preload is ready
electron_1.ipcRenderer.send('preload-ready');
//# sourceMappingURL=preload-fixed.js.map