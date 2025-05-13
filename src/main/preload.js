// Use require instead of import for Electron to work with CommonJS
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
// For debugging
console.log('Preload script executed');
// Expose a limited subset of electron and Node.js APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
    // IPC communication
    send: (channel, ...args) => {
        ipcRenderer.send(channel, ...args);
    },
    on: (channel, listener) => {
        // Use our own type definition to avoid TypeScript errors
        ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    },
    // Node.js path module (safe subset)
    path: {
        join: (...paths) => path.join(...paths),
        resolve: (...paths) => path.resolve(...paths),
        dirname: (p) => path.dirname(p),
        basename: (p, ext) => path.basename(p, ext),
        extname: (p) => path.extname(p),
        sep: path.sep
    },
    // File system access (limited subset)
    fs: {
        existsSync: (p) => fs.existsSync(p)
    },
    // OS info (safe subset)
    os: {
        platform: () => os.platform(),
        homedir: () => os.homedir(),
        tmpdir: () => os.tmpdir()
    }
});
// Also expose direct path methods to window.path (for compatibility with code expecting Node.js path)
contextBridge.exposeInMainWorld('path', {
    join: (...args) => path.join(...args),
    resolve: (...args) => path.resolve(...args),
    dirname: (p) => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: (p) => path.extname(p),
    sep: path.sep
});
