// This is a shim for Electron in the browser environment
// It provides a mock implementation of the Electron API when running in the browser

/**
 * @typedef {import('./electron').default} ElectronAPI
 */

// Import the path utilities for browser compatibility
import pathUtils from './utils/pathUtils';

// Check if we're running in Electron (window.electron would be defined by preload)
const isElectron = window && window.electron !== undefined;

// First check if window.path is already defined by preload script
const hasPathModule = typeof window !== 'undefined' && window.path !== undefined;

// Create path shim with robust error handling
const pathShim = {
  join: (...paths) => {
    try {
      // Try to use window.path if available
      if (hasPathModule && typeof window.path.join === 'function') {
        return window.path.join(...paths);
      }
      // Fallback to our path utilities
      return pathUtils.join(...paths);
    } catch (err) {
      console.error('Error in path.join:', err);
      // Minimal fallback implementation
      return paths.filter(Boolean).join('/');
    }
  },
  resolve: (...paths) => {
    try {
      if (hasPathModule && typeof window.path.resolve === 'function') {
        return window.path.resolve(...paths);
      }
      return pathUtils.resolve(...paths);
    } catch (err) {
      console.error('Error in path.resolve:', err);
      return paths.filter(Boolean).join('/');
    }
  },
  dirname: (p) => {
    try {
      if (hasPathModule && typeof window.path.dirname === 'function') {
        return window.path.dirname(p);
      }
      return pathUtils.dirname(p);
    } catch (err) {
      console.error('Error in path.dirname:', err);
      const lastSlashIndex = p.lastIndexOf('/');
      return lastSlashIndex === -1 ? '.' : p.slice(0, lastSlashIndex) || '/';
    }
  },
  basename: (p, ext) => {
    try {
      if (hasPathModule && typeof window.path.basename === 'function') {
        return window.path.basename(p, ext);
      }
      return pathUtils.basename(p, ext);
    } catch (err) {
      console.error('Error in path.basename:', err);
      let base = p.slice(p.lastIndexOf('/') + 1);
      if (ext && base.endsWith(ext)) {
        base = base.slice(0, -ext.length);
      }
      return base;
    }
  },
  extname: (p) => {
    try {
      if (hasPathModule && typeof window.path.extname === 'function') {
        return window.path.extname(p);
      }
      const lastDotIndex = p.lastIndexOf('.');
      return lastDotIndex !== -1 ? p.slice(lastDotIndex) : '';
    } catch (err) {
      console.error('Error in path.extname:', err);
      const lastDotIndex = p.lastIndexOf('.');
      return lastDotIndex !== -1 ? p.slice(lastDotIndex) : '';
    }
  },
  sep: '/'
};

// Expose path globally for any code that needs it
if (!hasPathModule) {
  window.path = pathShim;
}

// Default mock implementation
/** @type {ElectronAPI} */
const electronMock = {
  ipcRenderer: {
    on: (channel, listener) => {},
    send: (channel, ...args) => {},
    invoke: (channel, ...args) => Promise.resolve({}),
    removeAllListeners: (channel) => {},
  },

  // Event listeners (IPC)
  on: (channel, callback) => {
    // Return undefined to simulate no return cleanup function
    return undefined;
  },

  // Path module (browser-compatible implementation)
  path: pathShim,

  // File system utilities (browser-compatible implementation)
  fs: {
    existsSync: () => false // Cannot check files in browser context
  },

  // OS utilities (browser-compatible implementation)
  os: {
    platform: () => 'browser',
    homedir: () => '/',
    tmpdir: () => '/tmp'
  },

  // Most commonly used functions
  getPath: (name) => '',
  isPackaged: false,
  readDir: (path) => Promise.resolve([]),
  readFile: (path) => Promise.resolve(''),
  writeFile: (path, data) => Promise.resolve(true),

  // LLM methods
  downloadModel: (url, filename) => Promise.resolve({success: false, path: '', alreadyExists: false}),

  // Logging
  log: (level, message, ...args) => {},

  // LLM
  llm: {
    loadModel: (modelName, systemPrompt) => Promise.resolve({success: false, error: 'Mock implementation'}),
    isLoaded: () => Promise.resolve(false),
    getAvailableModels: () => Promise.resolve([]),
    generate: (prompt) => Promise.resolve({success: false, response: '', error: 'Mock implementation'}),
    resetChat: (systemPrompt) => Promise.resolve({success: false, error: 'Mock implementation'}),
  }
};

// Export either the real Electron API or a mock
/** @type {ElectronAPI} */
const electron = typeof window !== 'undefined' && window.electron
  ? window.electron
  : electronMock;

// Debugging
console.log('Electron API initialized:', !!window.electron);
console.log('Path API available:', !!window.path);

export default electron;
