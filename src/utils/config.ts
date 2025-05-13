// src/utils/config.ts
// Configuration module for both main and renderer processes
import * as dotenv from 'dotenv';

// Types for electron app
type AppPathName = 'home' | 'appData' | 'userData' | 'sessionData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps';

type ElectronApp = {
  getPath?: (name: AppPathName | string) => string;
};

// Environment detection - more robust checks
const isMain = typeof process !== 'undefined' &&
  (typeof (process as any).type === 'undefined' ||
  (process as any).type === 'browser');

const isRenderer = typeof process !== 'undefined' &&
  (process as any).type === 'renderer';

// Module variables with safe defaults
// Initialize path with safePath by default to avoid undefined errors
let path: { join: (...paths: string[]) => string; resolve: (...paths: string[]) => string } = {
  join: (...args: string[]) => args.filter(Boolean).join('/').replace(/\/+/g, '/'),
  resolve: (...args: string[]) => {
    const joined = args.filter(Boolean).join('/').replace(/\/+/g, '/');
    if (joined.startsWith('/')) return joined;
    return (typeof process !== 'undefined' ? process.cwd() : '.') + '/' + joined;
  }
};

let app: ElectronApp = {
  getPath: (name: AppPathName | string) => {
    // Safe fallback for app.getPath
    if (name === 'userData') return './userData';
    return '.';
  }
};
let electron: any = null;

// Safe path functions implementation
const safePath = {
  join: (...parts: string[]): string => {
    try {
      // Try native Node.js path first
      if (typeof require !== 'undefined') {
        const nodePath = require('path');
        return nodePath.join(...parts);
      }

      // ESM path if available
      if (typeof import.meta !== 'undefined') {
        // This is a runtime check that won't work in compilation but will work at runtime
        // But we have a fallback below if this fails
        try {
          // Bypass TypeScript's type checking for this dynamic require
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const req = (window as any).require || require;
          if (typeof req === 'function') {
            const pathModule = req('path');
            if (pathModule && typeof pathModule.join === 'function') {
              return pathModule.join(...parts);
            }
          }
        } catch (e) {
          // Continue to fallback
        }
      }

      // Renderer process with exposed electron API
      if (isRenderer && typeof window !== 'undefined' && (window as any).electron?.path?.join) {
        const electronPathJoin = (window as any).electron.path.join as (...args: string[]) => string;
        return electronPathJoin(...parts);
      }

      // Last resort: manual join implementation
      return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
    } catch (e) {
      console.error('Error in path.join:', e);
      // Fallback implementation
      return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
    }
  },

  resolve: (...parts: string[]): string => {
    try {
      // Try native Node.js path first
      if (typeof require !== 'undefined') {
        const nodePath = require('path');
        return nodePath.resolve(...parts);
      }

      // ESM path if available
      if (typeof import.meta !== 'undefined') {
        try {
          // Bypass TypeScript's type checking for this dynamic require
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const req = (window as any).require || require;
          if (typeof req === 'function') {
            const pathModule = req('path');
            if (pathModule && typeof pathModule.resolve === 'function') {
              return pathModule.resolve(...parts);
            }
          }
        } catch (e) {
          // Continue to fallback
        }
      }

      // Renderer process with exposed electron API
      if (isRenderer && typeof window !== 'undefined' && (window as any).electron?.path?.resolve) {
        const electronPathResolve = (window as any).electron.path.resolve as (...args: string[]) => string;
        return electronPathResolve(...parts);
      }

      // Last resort: simple implementation (not perfect but better than failing)
      const joined = parts.join('/').replace(/\/+/g, '/');
      if (joined.startsWith('/')) return joined;
      return process.cwd() + '/' + joined;
    } catch (e) {
      console.error('Error in path.resolve:', e);
      // Fallback implementation
      return process.cwd() + '/' + parts.filter(Boolean).join('/').replace(/\/+/g, '/');
    }
  }
};

// Synchronous module initialization to ensure path functions are available immediately
function initModules() {
  // Set up path with safe functions first
  path = safePath;

  if (isMain) {
    try {
      // CommonJS path
      if (typeof require !== 'undefined') {
        const electronModule = require('electron');
        electron = electronModule;
        app = electronModule.app || app;
        
        // Use Node's native path module in main process
        const nodePath = require('path');
        path = {
          join: nodePath.join.bind(nodePath),
          resolve: nodePath.resolve.bind(nodePath)
        };
      } else {
        // ESM path - We use synchronous approach with safe fallbacks
        console.warn('ESM context detected in main process - using path fallbacks');
        // Keep using safePath - we can't do dynamic import in a synchronous function
      }
    } catch (e) {
      console.error('Failed to load electron module in main process:', e);
      // Keep using safe fallbacks if electron can't be loaded
    }
  } else if (isRenderer) {
    // In renderer, use exposed electron API through window
    if (typeof window !== 'undefined' && (window as any).electron) {
      // Use exposed path functions from preload - preferred method for renderer process
      if ((window as any).electron.path) {
        console.log('Config: Using window.electron.path for path operations in renderer');
        // Directly use window.electron.path instead of creating wrapper functions
        path = (window as any).electron.path;
      }

      // Set up app.getPath using preload
      app = {
        getPath: (name: string) => {
          if ((window as any).electron.getPath) {
            const result = (window as any).electron.getPath(name);
            if (result instanceof Promise) {
              // Return a default value instead of waiting for Promise
              return name === 'userData' ? './userData' : '.';
            }
            return result || (name === 'userData' ? './userData' : '.');
          }
          return name === 'userData' ? './userData' : '.';
        }
      };
    }
  }
}

// Initialize the module synchronously
initModules();

// Load environment variables safely
const environment = process.env.NODE_ENV || 'development';
try {
  // Use safe path resolution to find environment file
  const envPath = path.resolve(process.cwd(), `.env.${environment}`);
  dotenv.config({ path: envPath });
} catch (e) {
  console.error('Error loading environment variables:', e);
  // Try fallback without explicit path
  try {
    dotenv.config();
  } catch (innerError) {
    console.error('Failed to load environment variables with fallback:', innerError);
  }
}

// Export main configuration
// Use a consistent port for development server
export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:5173', // Only use port 5173
  modelStoragePath: process.env.MODEL_STORAGE_PATH ||
    (isRenderer && (window as any).electron?.path && app?.getPath
      ? (window as any).electron.path.join(app.getPath('userData'), 'models') // Use electron.path directly in renderer
      : (app?.getPath ? path.join(app.getPath('userData'), 'models') : 'models')),
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
// More robust error handling
const store = {
  get: (key: string) => {
    // Try to get from localStorage in renderer
    if (isRenderer && typeof window !== 'undefined' && window.localStorage) {
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
    if (isRenderer && typeof window !== 'undefined' && window.localStorage) {
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
    return store.get('apiUrl') || config.apiUrl;
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