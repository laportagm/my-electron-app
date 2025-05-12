"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
electron_1.contextBridge.exposeInMainWorld('electron', {
    // App info
    isPackaged: process.env.NODE_ENV === 'production', // app.isPackaged isn't available in preload
    // File system methods
    getPath: function (name) { return electron_1.ipcRenderer.invoke('app:get-path', name); },
    readDir: function (path) { return electron_1.ipcRenderer.invoke('fs:read-dir', path); },
    readFile: function (path) { return electron_1.ipcRenderer.invoke('fs:read-file', path); },
    writeFile: function (path, data) { return electron_1.ipcRenderer.invoke('fs:write-file', path, data); },
    // Logging
    log: function (level, message) { return electron_1.ipcRenderer.send('log', level, message); },
});
