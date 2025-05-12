// This is a shim for Electron in the browser environment
// It provides a mock implementation of the Electron API when running in the browser

// Default mock implementation
const electronMock = {
  ipcRenderer: {
    on: () => {},
    send: () => {},
    invoke: () => Promise.resolve({}),
    removeAllListeners: () => {},
  },
  
  // Most commonly used functions
  getPath: () => '',
  isPackaged: false,
  readDir: () => Promise.resolve([]),
  readFile: () => Promise.resolve(''),
  writeFile: () => Promise.resolve(true),
  
  // LLM methods
  downloadModel: () => Promise.resolve({success: false, path: '', alreadyExists: false}),
  
  // Logging
  log: () => {},
  
  // LLM
  llm: {
    loadModel: () => Promise.resolve({success: false}),
    isLoaded: () => Promise.resolve(false),
    getAvailableModels: () => Promise.resolve([]),
    generate: () => Promise.resolve({success: false}),
    resetChat: () => Promise.resolve({success: false}),
  }
};

// Export either the real Electron API or a mock
export default typeof window !== 'undefined' && window.electron 
  ? window.electron 
  : electronMock;