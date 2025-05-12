// Use require instead of import for Electron to work with CommonJS
const { contextBridge, ipcRenderer } = require('electron');

// Define types for IPC events
interface IpcRendererEvent {
  sender: any;
  senderId: number;
}

// Define type-safe API
interface ElectronAPI {
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
}

// Expose a limited subset of electron APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, ...args: any[]): void => {
    ipcRenderer.send(channel, ...args);
  },
  on: (channel: string, listener: (...args: any[]) => void): void => {
    // Use our own type definition to avoid TypeScript errors
    ipcRenderer.on(channel, (_event: any, ...args: any[]) => 
      listener(...args)
    );
  }
} as ElectronAPI);