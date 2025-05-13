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
// src/main/preload/preload-esm.ts
// ESM version of preload script that works with both CommonJS and ESM
const electron_1 = require("electron");
const nodePath = __importStar(require("path"));
const nodeFs = __importStar(require("fs"));
const nodeOs = __importStar(require("os"));
// For debugging
console.log('Preload ESM script executed');
// Expose a limited subset of electron and Node.js APIs to the renderer
electron_1.contextBridge.exposeInMainWorld('electron', {
    // IPC communication
    send: (channel, ...args) => {
        electron_1.ipcRenderer.send(channel, ...args);
    },
    on: (channel, listener) => {
        electron_1.ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    },
    invoke: async (channel, ...args) => {
        return await electron_1.ipcRenderer.invoke(channel, ...args);
    },
    // Node.js path module (safe subset)
    path: {
        join: (...paths) => nodePath.join(...paths),
        resolve: (...paths) => nodePath.resolve(...paths),
        dirname: (p) => nodePath.dirname(p),
        basename: (p, ext) => nodePath.basename(p, ext),
        extname: (p) => nodePath.extname(p),
        sep: nodePath.sep
    },
    // File system access via IPC (controlled by main process)
    fs: {
        existsSync: (p) => nodeFs.existsSync(p),
        readFile: async (path) => {
            return await electron_1.ipcRenderer.invoke('fs:read-file', path);
        },
        writeFile: async (path, data) => {
            await electron_1.ipcRenderer.invoke('fs:write-file', path, data);
        },
        readDir: async (path) => {
            return await electron_1.ipcRenderer.invoke('fs:read-dir', path);
        }
    },
    // OS info (safe subset)
    os: {
        platform: () => nodeOs.platform(),
        homedir: () => nodeOs.homedir(),
        tmpdir: () => nodeOs.tmpdir()
    },
    // App paths
    getPath: async (name) => {
        return await electron_1.ipcRenderer.invoke('app:get-path', name);
    },
    // Logging
    log: (message) => {
        electron_1.ipcRenderer.send('log', message);
    },
    error: (message, error) => {
        electron_1.ipcRenderer.send('error', message, error === null || error === void 0 ? void 0 : error.message, error === null || error === void 0 ? void 0 : error.stack);
    }
});
// Also expose direct path methods to window.path (for compatibility with code expecting Node.js path)
electron_1.contextBridge.exposeInMainWorld('path', {
    join: (...args) => nodePath.join(...args),
    resolve: (...args) => nodePath.resolve(...args),
    dirname: (p) => nodePath.dirname(p),
    basename: (p, ext) => nodePath.basename(p, ext),
    extname: (p) => nodePath.extname(p),
    sep: nodePath.sep
});
// Let the main process know when preload is ready
electron_1.ipcRenderer.send('preload-ready');
//# sourceMappingURL=preload-esm.js.map