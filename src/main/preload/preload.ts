/**
 * Enhanced Preload Script for Electron Application
 *
 * This script safely exposes Node.js APIs to the renderer process through Electron's
 * contextBridge with comprehensive error handling, fallbacks, and environment detection.
 *
 * Features:
 * - Reliable path resolution across all environments
 * - Enhanced error handling and reporting
 * - Context detection (main, renderer, packaged, development)
 * - Self-diagnostic capabilities
 * - Multi-layered security model with safe API exposure
 */

// Using a named export to avoid conflicts with other preload files
export {};

// Load modules using CommonJS
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * ENVIRONMENT DETECTION
 * Detect current runtime environment for adaptive behavior
 */
const ENV = {
  isMain: typeof process !== 'undefined' && 
    (typeof process.type === 'undefined' || process.type === 'browser'),
  isRenderer: typeof process !== 'undefined' && process.type === 'renderer',
  isPackaged: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  platform: process.platform
};

/**
 * DIAGNOSTIC INFORMATION
 * Used for troubleshooting path resolution issues
 */
const DIAGNOSTICS = {
  version: '2.0.0',
  timestamp: new Date().toISOString(),
  environment: ENV,
  paths: {
    processCwd: process.cwd(),
    __dirname: __dirname,
    resourcesPath: process.resourcesPath || null
  }
};

/**
 * Enhanced path module with error handling wrappers
 * Each function safely wraps the Node.js path module with fallbacks
 */
const enhancedPath = {
  // Core path functions
  join: (...paths: string[]): string => {
    try {
      return path.join(...paths);
    } catch (error) {
      console.error('Path join error:', error);
      // Fallback implementation for reliable path joining
      return paths
        .filter(Boolean)
        .join('/')
        .replace(/\/{2,}/g, '/') // Replace multiple slashes with a single one
        .replace(/\/$/g, ''); // Remove trailing slash
    }
  },
  
  resolve: (...paths: string[]): string => {
    try {
      return path.resolve(...paths);
    } catch (error) {
      console.error('Path resolve error:', error);
      // Minimal fallback implementation 
      const joined = paths.filter(Boolean).join('/');
      return joined.startsWith('/') ? joined : `/${joined}`;
    }
  },
  
  dirname: (p: string): string => {
    try {
      return path.dirname(p);
    } catch (error) {
      console.error('Path dirname error:', error);
      // Fallback implementation
      if (!p) return '.';
      const normalized = p.replace(/\/+$/, '');
      const lastSlashIndex = normalized.lastIndexOf('/');
      if (lastSlashIndex === -1) return '.';
      if (lastSlashIndex === 0) return '/';
      return normalized.slice(0, lastSlashIndex);
    }
  },
  
  basename: (p: string, ext?: string): string => {
    try {
      return path.basename(p, ext);
    } catch (error) {
      console.error('Path basename error:', error);
      // Fallback implementation
      if (!p) return '';
      let base = p.slice(p.lastIndexOf('/') + 1);
      if (ext && base.endsWith(ext)) {
        base = base.slice(0, -ext.length);
      }
      return base;
    }
  },
  
  extname: (p: string): string => {
    try {
      return path.extname(p);
    } catch (error) {
      console.error('Path extname error:', error);
      // Fallback implementation
      if (!p) return '';
      const lastDotIndex = p.lastIndexOf('.');
      const lastSlashIndex = p.lastIndexOf('/');
      if (lastDotIndex === -1 || lastDotIndex < lastSlashIndex) return '';
      return p.slice(lastDotIndex);
    }
  },
  
  // Standard properties
  sep: path.sep,
  delimiter: path.delimiter,
  
  // Additional utility functions 
  normalize: (p: string): string => {
    try {
      return path.normalize(p);
    } catch (error) {
      console.error('Path normalize error:', error);
      // Simple normalization fallback
      return p.replace(/\\/g, '/').replace(/\/+/g, '/');
    }
  },
  
  // Diagnostic method for troubleshooting
  _diagnose: (testPath: string): Record<string, any> => {
    return {
      original: testPath,
      join: enhancedPath.join('test', testPath),
      resolve: enhancedPath.resolve(testPath),
      dirname: enhancedPath.dirname(testPath),
      basename: enhancedPath.basename(testPath),
      extname: enhancedPath.extname(testPath),
      environment: ENV
    };
  }
};

/**
 * Enhanced file system access with error handling
 * Limited subset of fs functionality with checks
 */
const enhancedFs = {
  existsSync: (p: string): boolean => {
    try {
      return fs.existsSync(p);
    } catch (error) {
      console.error('FS existsSync error:', error);
      return false;
    }
  },
  
  // Additional safe fs utilities
  statSync: (p: string): { isFile: boolean, isDirectory: boolean, size: number } | null => {
    try {
      const stats = fs.statSync(p);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size
      };
    } catch (error) {
      console.error('FS statSync error:', error);
      return null;
    }
  }
};

/**
 * Enhanced OS utilities with fallbacks
 */
const enhancedOs = {
  platform: (): string => {
    try {
      return os.platform();
    } catch (error) {
      console.error('OS platform error:', error);
      return process.platform || 'unknown';
    }
  },
  
  homedir: (): string => {
    try {
      return os.homedir();
    } catch (error) {
      console.error('OS homedir error:', error);
      return ENV.platform === 'win32' ? 'C:\\Users\\Default' : '/home/user';
    }
  },
  
  tmpdir: (): string => {
    try {
      return os.tmpdir();
    } catch (error) {
      console.error('OS tmpdir error:', error);
      return ENV.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp';
    }
  }
};

/**
 * Enhanced IPC communication with error handling
 */
const enhancedIpc = {
  send: (channel: string, ...args: any[]): void => {
    try {
      ipcRenderer.send(channel, ...args);
    } catch (error) {
      console.error(`IPC send error (${channel}):`, error);
      // Attempt to send error through separate error channel
      try {
        ipcRenderer.send('ipc:error', `Failed to send message on channel ${channel}`, error);
      } catch (e) {
        // Last resort logging
        console.error('Failed to report IPC error:', e);
      }
    }
  },
  
  on: (channel: string, listener: (...args: any[]) => void): void => {
    try {
      ipcRenderer.on(channel, (_event: any, ...args: any[]) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in IPC listener for ${channel}:`, error);
        }
      });
    } catch (error) {
      console.error(`IPC on error (${channel}):`, error);
    }
  },
  
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`IPC invoke error (${channel}):`, error);
      throw error; // Re-throw to allow handling in renderer
    }
  },
  
  removeAllListeners: (channel: string): void => {
    try {
      ipcRenderer.removeAllListeners(channel);
    } catch (error) {
      console.error(`IPC removeAllListeners error (${channel}):`, error);
    }
  }
};

/**
 * Enhanced logging system that routes through IPC
 */
const logger = {
  info: (message: string, ...args: any[]): void => {
    enhancedIpc.send('log', 'info', message, ...args);
    console.info(message, ...args);
  },
  
  error: (message: string, error?: Error, ...args: any[]): void => {
    enhancedIpc.send('error', message, error?.message, error?.stack, ...args);
    console.error(message, error, ...args);
  }
};

/**
 * Self-diagnosis tools for troubleshooting
 */
const diagnostics = {
  getEnvironmentInfo: (): Record<string, any> => {
    return {
      ...DIAGNOSTICS,
      timestamp: new Date().toISOString(), // Updated timestamp
      runtime: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
      }
    };
  },
  
  testPathResolution: (testPath: string): Record<string, any> => {
    return enhancedPath._diagnose(testPath);
  }
};

/**
 * Log preload script initialization 
 */
logger.info('Preload script initializing', DIAGNOSTICS);

/**
 * Expose the electron API to the renderer process via contextBridge
 */
try {
  contextBridge.exposeInMainWorld('electron', {
    // Versioning and environment
    isPackaged: ENV.isPackaged,
    
    // Enhanced IPC with error handling
    send: enhancedIpc.send,
    on: enhancedIpc.on,
    
    // Enhanced path module with fallbacks
    path: {
      join: enhancedPath.join,
      resolve: enhancedPath.resolve,
      dirname: enhancedPath.dirname,
      basename: enhancedPath.basename,
      extname: enhancedPath.extname,
      sep: enhancedPath.sep
    },
    
    // Safe filesystem access
    fs: {
      existsSync: enhancedFs.existsSync
    },
    
    // OS information
    os: {
      platform: enhancedOs.platform,
      homedir: enhancedOs.homedir,
      tmpdir: enhancedOs.tmpdir
    },
    
    // File system methods through IPC
    getPath: (name: string) => enhancedIpc.invoke('app:get-path', name),
    readDir: (path: string) => enhancedIpc.invoke('fs:read-dir', path),
    readFile: (path: string) => enhancedIpc.invoke('fs:read-file', path),
    writeFile: (path: string, data: string) => enhancedIpc.invoke('fs:write-file', path, data),
    
    // Logging
    log: (level: string, message: string) => enhancedIpc.send('log', level, message),
    
    // Diagnostics tools for troubleshooting
    _diagnostics: diagnostics
  });
  
  // Also expose path methods directly for compatibility
  contextBridge.exposeInMainWorld('path', {
    join: enhancedPath.join,
    resolve: enhancedPath.resolve,
    dirname: enhancedPath.dirname,
    basename: enhancedPath.basename,
    extname: enhancedPath.extname,
    normalize: enhancedPath.normalize,
    sep: enhancedPath.sep,
    delimiter: enhancedPath.delimiter
  });
  
  logger.info('Preload script successfully initialized and APIs exposed');
} catch (error) {
  console.error('Failed to expose APIs via contextBridge:', error);
  
  // Try to report the error to the main process
  try {
    ipcRenderer.send('preload:error', 'Failed to initialize preload script', error);
  } catch (e) {
    // If even that fails, at least log to console
    console.error('Additionally failed to report initialization error:', e);
  }
}

// Set up error handling for uncaught exceptions in the preload script
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in preload script:', error);
  
  try {
    ipcRenderer.send('preload:uncaught-exception', error.message, error.stack);
  } catch (e) {
    console.error('Failed to report uncaught exception:', e);
  }
});

// Listen for diagnostic requests from the main process
ipcRenderer.on('request:diagnostics', () => {
  try {
    const info = diagnostics.getEnvironmentInfo();
    ipcRenderer.send('response:diagnostics', info);
  } catch (error) {
    console.error('Failed to generate diagnostics:', error);
    // Type assertion for error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    ipcRenderer.send('response:diagnostics', { error: errorMessage });
  }
});