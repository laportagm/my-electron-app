"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
electron_1.contextBridge.exposeInMainWorld('electron', {
    // App info
    isPackaged: process.env.NODE_ENV === 'production', // app.isPackaged isn't available in preload
    // File system methods
    getPath: (name) => electron_1.ipcRenderer.invoke('app:get-path', name),
    readDir: (path) => electron_1.ipcRenderer.invoke('fs:read-dir', path),
    readFile: (path) => electron_1.ipcRenderer.invoke('fs:read-file', path),
    writeFile: (path, data) => electron_1.ipcRenderer.invoke('fs:write-file', path, data),
    // Logging
    log: (level, message) => electron_1.ipcRenderer.send('log', level, message),
});
//# sourceMappingURL=preload-minimal.js.map