// src/main/preload/preload-fixed.ts
import { contextBridge, ipcRenderer } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Expose protected Node.js APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // File system operations
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('fs:write-file', filePath, data),
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:read-dir', dirPath),

  // App paths
  getPath: (name: string) => ipcRenderer.invoke('app:get-path', name),

  // Logging
  log: (message: string) => ipcRenderer.send('log', message),
  error: (message: string, error?: Error) =>
    ipcRenderer.send('error', message, error?.message, error?.stack),

  // Path utilities - expose safe wrappers around Node's path module
  path: {
    join: (...args: string[]) => path.join(...args),
    resolve: (...args: string[]) => path.resolve(...args),
    dirname: (p: string) => path.dirname(p),
    basename: (p: string, ext?: string) => path.basename(p, ext),
    extname: (p: string) => path.extname(p),
    sep: path.sep
  },

  // File system access (limited subset) - required for tests
  fs: {
    existsSync: (p: string) => fs.existsSync(p)
  },

  // OS info (safe subset) - required for tests
  os: {
    platform: () => os.platform(),
    homedir: () => os.homedir(),
    tmpdir: () => os.tmpdir()
  },

  // Send events to main process
  send: (channel: string, ...args: any[]) => {
    // Whitelist channels for security
    const validChannels = ['log', 'error', 'app-ready'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // Receive events from main process
  on: (channel: string, func: (...args: any[]) => void) => {
    // Whitelist channels for security
    const validChannels = ['app-event', 'update-available', 'model-loaded'];
    if (validChannels.includes(channel)) {
      // Remove duplicated listeners
      ipcRenderer.removeAllListeners(channel);
      // Add the new listener
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

// Let the main process know when preload is ready
ipcRenderer.send('preload-ready');