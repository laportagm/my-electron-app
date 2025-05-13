#!/bin/bash

echo "🔧 Fixing Electron 'path.join is not a function' error..."
echo "   Updating preload script and configurations..."

# Update the preload script to expose path module properly
cat > src/main/preload.ts << 'EOL'
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
EOL

# Update electron.d.ts to include path interface
cat > src/renderer/electron.d.ts << 'EOL'
/**
 * Electron API types for browser compatibility
 */

interface ElectronAPI {
  ipcRenderer?: {
    on: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    removeAllListeners: (channel: string) => void;
  };

  // Path module
  path: {
    join: (...paths: string[]) => string;
    resolve: (...paths: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string, ext?: string) => string;
    extname: (path: string) => string;
    sep: string;
  };

  // File system
  fs: {
    existsSync: (path: string) => boolean;
  };

  // OS
  os: {
    platform: () => string;
    homedir: () => string;
    tmpdir: () => string;
  };

  getPath: (name: string) => string | Promise<string>;
  isPackaged: boolean;
  readDir: (path: string) => Promise<string[]>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<boolean>;

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;

  // LLM download
  downloadModel: (url: string, filename: string) => Promise<{success: boolean, path: string, alreadyExists: boolean}>;

  log: (level: string, message: string, ...args: any[]) => void;

  llm: {
    loadModel: (modelName: string, systemPrompt: string) => Promise<{success: boolean, error?: string}>;
    isLoaded: () => Promise<boolean>;
    getAvailableModels: () => Promise<string[]>;
    generate: (prompt: string) => Promise<{success: boolean, response?: string, error?: string}>;
    resetChat: (systemPrompt: string) => Promise<{success: boolean, error?: string}>;
  };
}

// Global window interface
declare global {
  interface Window {
    electron: ElectronAPI;
    path: {
      join: (...paths: string[]) => string;
      resolve: (...paths: string[]) => string;
      dirname: (path: string) => string;
      basename: (path: string, ext?: string) => string;
      extname: (path: string) => string;
      sep: string;
    };
  }
}

declare const electron: ElectronAPI;
export default electron;
EOL

# Update polyfills.js to include path polyfill
cat > src/renderer/polyfills.js << 'EOL'
// Add polyfills for Electron environment that aren't available in ESM
// This file should be imported before any other imports in index.tsx

if (typeof window !== 'undefined' && typeof global === 'undefined') {
  window.global = window;
}

// Create polyfills for __dirname and __filename in ESM context
if (typeof global !== 'undefined' && typeof __dirname === 'undefined') {
  // @ts-ignore
  global.__dirname = import.meta.url
    ? new URL('.', import.meta.url).pathname 
    : process.cwd();
    
  // @ts-ignore
  global.__filename = import.meta.url
    ? new URL(import.meta.url).pathname
    : `${process.cwd()}/unknown-file.js`;
}

// Add process object if not available
if (typeof process === 'undefined') {
  // @ts-ignore
  window.process = {
    env: {
      NODE_ENV: 'development'
    }
  };
}

// Ensure path module is available
if (typeof window !== 'undefined' && !window.path) {
  // This will be replaced by the proper path module from preload script
  // or by our pathUtils implementation in electron.js
  window.path = {
    join: (...args) => args.join('/'),
    resolve: (...args) => args.join('/'),
    dirname: (p) => p.split('/').slice(0, -1).join('/') || '/',
    basename: (p) => p.split('/').pop() || '',
    extname: (p) => {
      const lastDotIndex = p.lastIndexOf('.');
      return lastDotIndex !== -1 ? p.slice(lastDotIndex) : '';
    },
    sep: '/'
  };
  
  console.log('Path polyfill initialized');
}

console.log('Polyfills loaded');
EOL

# Update electron.js to handle window.path properly
cat > src/renderer/electron.js << 'EOL'
// This is a shim for Electron in the browser environment
// It provides a mock implementation of the Electron API when running in the browser

/**
 * @typedef {import('./electron').default} ElectronAPI
 */

// Import the path utilities for browser compatibility
import pathUtils from './utils/pathUtils';

// Check if we're running in Electron (window.electron would be defined by preload)
const isElectron = window && window.electron !== undefined;

// Shim path module for Node.js compatibility - it's either from preload or our fallback
const pathShim = window.path || {
  join: (...paths) => pathUtils.join(...paths),
  resolve: (...paths) => pathUtils.resolve(...paths),
  dirname: (p) => pathUtils.dirname(p),
  basename: (p, ext) => pathUtils.basename(p, ext),
  extname: (p) => {
    const lastDotIndex = p.lastIndexOf('.');
    return lastDotIndex !== -1 ? p.slice(lastDotIndex) : '';
  },
  sep: '/'
};

// Expose path globally for any code that needs it
if (!window.path) {
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
EOL

# Update the main.ts to use the correct preload script path
sed -i '' 's|preload: path.join(__dirname, "preload/preload.js"),|preload: path.join(__dirname, "preload.js"),|' src/main/main.ts

# Update nodeIntegration to false for better security
sed -i '' 's|nodeIntegration: true,|nodeIntegration: false,|' src/main/main.ts

echo "✅ Fixed Electron path.join error!"
echo "   You can now run your Electron app with 'npm run dev'"
echo "   Note: If using path.join in renderer, always use window.electron.path.join instead"
