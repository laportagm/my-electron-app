// Use require instead of import for Electron to work with CommonJS
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

// For debugging
console.log('Preload script executed');

// Define types for IPC events
interface IpcRendererEvent {
  sender: any;
  senderId: number;
}

// Define type-safe API
interface ElectronAPI {
  // IPC communication
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;

  // Node.js path module
  path: {
    join: (...paths: string[]) => string;
    resolve: (...paths: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string, ext?: string) => string;
    extname: (path: string) => string;
    sep: string;
  };

  // File system access (limited subset)
  fs: {
    existsSync: (path: string) => boolean;
  };

  // OS info
  os: {
    platform: () => string;
    homedir: () => string;
    tmpdir: () => string;
  };
}

// Expose a limited subset of electron and Node.js APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
  // IPC communication
  send: (channel: string, ...args: any[]): void => {
    ipcRenderer.send(channel, ...args);
  },
  on: (channel: string, listener: (...args: any[]) => void): void => {
    // Use our own type definition to avoid TypeScript errors
    ipcRenderer.on(channel, (_event: any, ...args: any[]) =>
      listener(...args)
    );
  },

  // Node.js path module (safe subset)
  path: {
    join: (...paths: string[]) => path.join(...paths),
    resolve: (...paths: string[]) => path.resolve(...paths),
    dirname: (p: string) => path.dirname(p),
    basename: (p: string, ext?: string) => path.basename(p, ext),
    extname: (p: string) => path.extname(p),
    sep: path.sep
  },

  // File system access (limited subset)
  fs: {
    existsSync: (p: string) => fs.existsSync(p)
  },

  // OS info (safe subset)
  os: {
    platform: () => os.platform(),
    homedir: () => os.homedir(),
    tmpdir: () => os.tmpdir()
  }
} as ElectronAPI);

// Also expose direct path methods to window.path (for compatibility with code expecting Node.js path)
contextBridge.exposeInMainWorld('path', {
  join: (...args: string[]) => path.join(...args),
  resolve: (...args: string[]) => path.resolve(...args),
  dirname: (p: string) => path.dirname(p),
  basename: (p: string, ext?: string) => path.basename(p, ext),
  extname: (p: string) => path.extname(p),
  sep: path.sep
});
