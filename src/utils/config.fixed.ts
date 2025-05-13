// src/utils/config.ts
import * as dotenv from 'dotenv';
import * as nodePath from 'path';

// Define type for electron app that's compatible with Electron's App type
export type ElectronApp = {
  getPath?: (name: any) => string;
};

// We need to handle different environments properly
const isMain = typeof process !== 'undefined' &&
               (typeof (process as any).type === 'undefined' ||
               (process as any).type === 'browser');

// In Electron renderer process
const isRenderer = typeof process !== 'undefined' && (process as any).type === 'renderer';

// Setup path and app correctly based on environment
let path = nodePath;
let app: ElectronApp = { getPath: () => '' };
let electron: any = null;

// Module initialization - use promises for ESM context
let initialized = false;
let initializing = false;
let initPromise: Promise<void> | null = null;

// Initialize modules using dynamic imports (for ESM compatibility)
async function initModulesDynamic(): Promise<void> {
  if (initialized || initializing) {
    return initPromise || Promise.resolve();
  }

  initializing = true;

  initPromise = new Promise<void>(async (resolve) => {
    try {
      if (isMain) {
        // In the main process, directly import electron
        try {
          const electronModule = await import('electron');
          electron = electronModule;
          app = electronModule.app as ElectronApp;
        } catch (e) {
          console.error('Failed to dynamically import electron:', e);
        }
      } else {
        // In renderer, try to use the exposed electron API
        if (typeof window !== 'undefined' && (window as any).electron) {
          app = {
            getPath: (name: string) => {
              const getPathFn = (window as any).electron.getPath;
              return typeof getPathFn === 'function' ? getPathFn(name) : '';
            }
          };
        }
      }
    } catch (e) {
      console.error('Failed to initialize modules dynamically:', e);
    } finally {
      initialized = true;
      initializing = false;
      resolve();
    }
  });

  return initPromise;
}

// Initialize modules synchronously for compatibility with CommonJS
function initModulesSync() {
  try {
    if (isMain) {
      // Use require for CJS compatibility in main process
      if (typeof require !== 'undefined') {
        try {
          const electronModule = require('electron');
          electron = electronModule;
          app = electronModule.app as ElectronApp;
        } catch (e) {
          console.error('Failed to require electron module:', e);
        }
      }
    } else {
      // Renderer process - try to use exposed electron API
      if (typeof window !== 'undefined' && (window as any).electron) {
        app = {
          getPath: (name: string) => {
            const getPathFn = (window as any).electron.getPath;
            return typeof getPathFn === 'function' ? getPathFn(name) : '';
          }
        };
      }
    }

    initialized = true;
  } catch (e) {
    console.error('Failed to initialize modules synchronously:', e);
  }
}

// Initialize modules
initModulesSync();

// Also start async initialization in case we're in ESM context
initModulesDynamic().catch(err => {
  console.error('Async module initialization failed:', err);
});

// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';

// Use consistent path resolution using nodePath
const envPath = nodePath.resolve(process.cwd(), `.env.${environment}`);
dotenv.config({ path: envPath });

export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:5173',
  modelStoragePath: process.env.MODEL_STORAGE_PATH || 
    (app?.getPath ? nodePath.join(app.getPath('userData'), 'models') : 'models'),
  debugMode: process.env.DEBUG_MODE === 'true'
};

// For renderer process
// Define the schema type for better TypeScript support
export interface ConfigStore {
  apiUrl?: string;
  theme?: 'light' | 'dark';
  loggingLevels?: {
    assets?: 'verbose' | 'normal' | 'quiet';
    models?: 'verbose' | 'normal' | 'quiet';
  };
}

// Simple in-memory store as a fallback
const memoryStore: Record<string, any> = {
  // Default logging configuration
  loggingLevels: {
    assets: 'normal',  // Default to normal logging
    models: 'normal'
  }
};

// Create a simple store implementation that doesn't rely on electron-store
const store = {
  get: (key: string) => {
    // Try to get from localStorage in renderer process
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
    // Store in localStorage in renderer process
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

  // Asset and model logging configuration
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