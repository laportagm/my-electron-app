#!/bin/bash

# Fix Electron Issues Script
# This script applies the fixes for port mismatch, require not defined,
# and path.resolve not a function errors in the electron app.

echo "📋 Applying Electron fixes..."

# Backup original files
echo "🔄 Creating backups..."
mkdir -p backups
cp src/utils/config.ts backups/config.ts.backup
cp wait-and-launch.js backups/wait-and-launch.js.backup
cp src/main/preload.ts backups/preload.ts.backup
cp src/main/preload/preload.ts backups/preload-folder.ts.backup 2>/dev/null || :

# Fix wait-and-launch.js for port mismatch
echo "🛠️ Fixing port mismatch in wait-and-launch.js..."
cat > wait-and-launch.js << 'EOF'
#!/usr/bin/env node

/**
 * wait-and-launch.js
 * 
 * This script waits for the development server to be ready 
 * before launching Electron.
 */

import waitOn from 'wait-on';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use only the port 5173 which matches Vite's configuration
const devUrl = 'http://localhost:5173';

// Electron entry point
const electronEntryPoint = path.join(__dirname, 'src', 'main', 'main.dev.cjs');

console.log('🔍 Waiting for development server to be ready...');
console.log(`   Checking URL: ${devUrl}`);

// Options for wait-on
const options = {
  resources: [`${devUrl}/`], // Add trailing slash to ensure full URL
  interval: 1000, // Check every second
  timeout: 60000, // Timeout after 1 minute
  validateStatus: status => status !== 404, // Any status but 404 is OK
  log: true
};

// Wait for dev server to be ready
waitOn(options)
  .then(() => {
    console.log(`✅ Development server ready at ${devUrl}`);
    console.log(`🚀 Launching Electron...`);

    // Launch Electron with the development entry point
    const electronProcess = spawn('npx', ['electron', electronEntryPoint], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: devUrl // Pass the working URL to Electron
      }
    });

    electronProcess.on('close', (code) => {
      console.log(`Electron process exited with code ${code}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error waiting for development server:', error);
    process.exit(1);
  });
EOF

# Fix config.ts for require not defined and path.resolve errors
echo "🛠️ Fixing config.ts module issues..."
cat > src/utils/config.ts << 'EOF'
// src/utils/config.ts
// Configuration module for both main and renderer processes
import * as dotenv from 'dotenv';
import * as nodePath from 'path';

// Types for electron app
type ElectronApp = {
  getPath?: (name: string) => string;
};

// Environment detection
const isMain = typeof process !== 'undefined' && 
  (typeof (process as any).type === 'undefined' || 
  (process as any).type === 'browser');

const isRenderer = typeof process !== 'undefined' && 
  (process as any).type === 'renderer';

// Module variables
let path = nodePath;
let app: ElectronApp = { getPath: () => '' };
let electron: any = null;

// Module initialization - sync version for direct execution
function initModules() {
  // Always use Node.js path module
  path = nodePath;
  
  if (isMain) {
    try {
      // Try to use require for compatibility with CommonJS
      // This is safe since we're checking for its existence first
      if (typeof require !== 'undefined') {
        const electronModule = require('electron');
        electron = electronModule;
        app = electronModule.app;
      } else {
        // In ESM context, falls back to default
        console.log('Running in ESM context, using path defaults');
      }
    } catch (e) {
      console.error('Failed to load electron module in main process:', e);
    }
  } else if (isRenderer) {
    // In renderer, try to use exposed electron API through window
    if (typeof window !== 'undefined' && (window as any).electron) {
      app = {
        getPath: (name: string) => {
          // Return a dummy path for tests or fall back to window.electron.getPath as Promise or direct value
          if ((window as any).electron.getPath) {
            const result = (window as any).electron.getPath(name);
            return result instanceof Promise ? '' : result;
          }
          return '';
        }
      };
    }
  }
}

// Initialize the module
initModules();

// Load environment variables
const environment = process.env.NODE_ENV || 'development';
try {
  // Use safe path resolution to find environment file
  const envPath = nodePath.resolve(process.cwd(), `.env.${environment}`);
  dotenv.config({ path: envPath });
} catch (e) {
  console.error('Error loading environment variables:', e);
}

// Export main configuration
export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:5173',
  modelStoragePath: process.env.MODEL_STORAGE_PATH || 
    (app?.getPath ? path.join(app.getPath('userData'), 'models') : 'models'),
  debugMode: process.env.DEBUG_MODE === 'true'
};

// In-memory store for config values
const memoryStore: Record<string, any> = {
  loggingLevels: {
    assets: 'normal',
    models: 'normal'
  }
};

// Store implementation using localStorage in renderer or memory in main
const store = {
  get: (key: string) => {
    // Try to get from localStorage in renderer
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const value = window.localStorage.getItem(`config_${key}`);
        return value ? JSON.parse(value) : null;
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    }
    
    // Fallback to memory store
    return memoryStore[key] || null;
  },
  
  set: (key: string, value: any) => {
    // Store in localStorage in renderer
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`config_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing to localStorage:', e);
      }
    }
    
    // Always store in memory
    memoryStore[key] = value;
  }
};

// Export renderer configuration
export const rendererConfig = {
  getApiUrl: (): string | undefined => {
    return store.get('apiUrl');
  },

  getTheme: (): 'light' | 'dark' => {
    const theme = store.get('theme');
    return theme === 'light' || theme === 'dark' ? theme : 'light';
  },

  setTheme: (theme: 'light' | 'dark'): void => {
    store.set('theme', theme);
  },

  getLoggingLevel: (category: 'assets' | 'models'): 'verbose' | 'normal' | 'quiet' => {
    const loggingLevels = store.get('loggingLevels') || {};
    const level = loggingLevels[category];

    // Return valid logging levels only, default to 'normal'
    return (level === 'verbose' || level === 'normal' || level === 'quiet')
      ? level
      : 'normal';
  },

  setLoggingLevel: (category: 'assets' | 'models', level: 'verbose' | 'normal' | 'quiet'): void => {
    const loggingLevels = store.get('loggingLevels') || {};
    loggingLevels[category] = level;
    store.set('loggingLevels', loggingLevels);
  }
};
EOF

# Create ESM preload script if needed
echo "🛠️ Creating ESM-compatible preload script..."
mkdir -p src/main/preload
cat > src/main/preload/preload-esm.ts << 'EOF'
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
EOF

# Make script and wait-and-launch.js executable
chmod +x wait-and-launch.js

echo "✅ All fixes applied successfully!"
echo "📝 See ELECTRON_FIXES.md for detailed information about the fixes."
echo ""
echo "To run the app, use: npm run dev"