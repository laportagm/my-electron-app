import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  send:  (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on:    (channel: string, listener: (...args: any[]) => void) =>
           ipcRenderer.on(channel, (event, ...args) => listener(...args))
})
