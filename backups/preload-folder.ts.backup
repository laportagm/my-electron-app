import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld('electron', {
  // App info
  isPackaged: process.env.NODE_ENV === 'production', // app.isPackaged isn't available in preload
  
  // File system methods
  getPath: (name: string) => ipcRenderer.invoke('app:get-path', name),
  readDir: (path: string) => ipcRenderer.invoke('fs:read-dir', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, data: string) => ipcRenderer.invoke('fs:write-file', path, data),
  
  // Logging
  log: (level: string, message: string) => ipcRenderer.send('log', level, message),
});