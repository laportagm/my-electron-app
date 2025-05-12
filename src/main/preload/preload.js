var _a = require('electron'), contextBridge = _a.contextBridge, ipcRenderer = _a.ipcRenderer;
// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld('electron', {
    // App info
    isPackaged: process.env.NODE_ENV === 'production', // app.isPackaged isn't available in preload
    // File system methods
    getPath: function (name) { return ipcRenderer.invoke('app:get-path', name); },
    readDir: function (path) { return ipcRenderer.invoke('fs:read-dir', path); },
    readFile: function (path) { return ipcRenderer.invoke('fs:read-file', path); },
    writeFile: function (path, data) { return ipcRenderer.invoke('fs:write-file', path, data); },
    // Logging
    log: function (level, message) { return ipcRenderer.send('log', level, message); },
});
