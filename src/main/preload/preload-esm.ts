// src/main/preload/preload-esm.ts
// ESM version of preload script that works with both CommonJS and ESM
import { contextBridge, ipcRenderer } from 'electron';
import * as nodePath from 'path';
import * as nodeFs from 'fs';
import * as nodeOs from 'os';

// For debugging
console.log('Preload ESM script executed');

// Define type-safe API
interface ElectronAPI {
  // IPC communication
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  invoke: <T>(channel: string, ...args: any[]) => Promise<T>;

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
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, data: string) => Promise<void>;
    readDir: (path: string) => Promise<string[]>;
  };

  // OS info
  os: {
    platform: () => string;
    homedir: () => string;
    tmpdir: () => string;
  };

  // App paths
  getPath: (name: string) => Promise<string>;
  
  // Logging
  log: (message: string) => void;
  error: (message: string, error?: Error) => void;
}

// Expose a limited subset of electron and Node.js APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
  // IPC communication
  send: (channel: string, ...args: any[]): void => {
    ipcRenderer.send(channel, ...args);
  },
  
  on: (channel: string, listener: (...args: any[]) => void): void => {
    ipcRenderer.on(channel, (_event: any, ...args: any[]) =>
      listener(...args)
    );
  },
  
  invoke: async <T>(channel: string, ...args: any[]): Promise<T> => {
    return await ipcRenderer.invoke(channel, ...args);
  },

  // Node.js path module (safe subset)
  path: {
    join: (...paths: string[]) => nodePath.join(...paths),
    resolve: (...paths: string[]) => nodePath.resolve(...paths),
    dirname: (p: string) => nodePath.dirname(p),
    basename: (p: string, ext?: string) => nodePath.basename(p, ext),
    extname: (p: string) => nodePath.extname(p),
    sep: nodePath.sep
  },

  // File system access via IPC (controlled by main process)
  fs: {
    existsSync: (p: string) => nodeFs.existsSync(p),
    readFile: async (path: string): Promise<string> => {
      return await ipcRenderer.invoke('fs:read-file', path);
    },
    writeFile: async (path: string, data: string): Promise<void> => {
      await ipcRenderer.invoke('fs:write-file', path, data);
    },
    readDir: async (path: string): Promise<string[]> => {
      return await ipcRenderer.invoke('fs:read-dir', path);
    }
  },

  // OS info (safe subset)
  os: {
    platform: () => nodeOs.platform(),
    homedir: () => nodeOs.homedir(),
    tmpdir: () => nodeOs.tmpdir()
  },
  
  // App paths
  getPath: async (name: string): Promise<string> => {
    return await ipcRenderer.invoke('app:get-path', name);
  },
  
  // Logging
  log: (message: string): void => {
    ipcRenderer.send('log', message);
  },
  
  error: (message: string, error?: Error): void => {
    ipcRenderer.send('error', message, error?.message, error?.stack);
  }
} as ElectronAPI);

// Also expose direct path methods to window.path (for compatibility with code expecting Node.js path)
contextBridge.exposeInMainWorld('path', {
  join: (...args: string[]) => nodePath.join(...args),
  resolve: (...args: string[]) => nodePath.resolve(...args),
  dirname: (p: string) => nodePath.dirname(p),
  basename: (p: string, ext?: string) => nodePath.basename(p, ext),
  extname: (p: string) => nodePath.extname(p),
  sep: nodePath.sep
});

// Let the main process know when preload is ready
ipcRenderer.send('preload-ready');
