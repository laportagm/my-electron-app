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