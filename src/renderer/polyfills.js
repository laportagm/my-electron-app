/**
 * Polyfills for Electron environment that aren't available in ESM
 * This file MUST be imported before any other imports in index.tsx
 *
 * Version: 2.0
 * Features:
 * - Robust path module polyfill
 * - Fallback mechanism for Node.js globals
 * - Error-resilient implementations
 * - Environment detection
 */

// Set up environment detection
const ENV = {
  isElectron: typeof window !== 'undefined' &&
    (window.electron !== undefined ||
     navigator.userAgent.toLowerCase().indexOf('electron') > -1),
  isBrowser: typeof window !== 'undefined',
  isNodeJS: typeof process !== 'undefined' && process.versions && process.versions.node,
  isTest: typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test'
};

// Log execution environment for debugging
console.log(`Polyfills initializing in environment:`, {
  isElectron: ENV.isElectron,
  isBrowser: ENV.isBrowser,
  isNodeJS: ENV.isNodeJS,
  isTest: ENV.isTest
});

// Set up global object for browser environments
if (ENV.isBrowser && typeof global === 'undefined') {
  window.global = window;
}

// Create polyfills for __dirname and __filename in ESM context
if (typeof global !== 'undefined' && typeof __dirname === 'undefined') {
  try {
    // @ts-ignore
    global.__dirname = import.meta.url
      ? new URL('.', import.meta.url).pathname
      : process.cwd?.() || '/';

    // @ts-ignore
    global.__filename = import.meta.url
      ? new URL(import.meta.url).pathname
      : process.cwd?.() ? `${process.cwd()}/unknown-file.js` : '/unknown-file.js';
  } catch (err) {
    console.warn('Error setting up __dirname and __filename polyfills:', err);
    // Fallback values
    global.__dirname = '/';
    global.__filename = '/unknown-file.js';
  }
}

// Add process object if not available
if (typeof process === 'undefined') {
  // @ts-ignore
  window.process = {
    env: {
      NODE_ENV: process?.env?.NODE_ENV || 'development'
    },
    cwd: () => '/'
  };
}

/**
 * Enhanced path module implementation
 * Has multiple layers of fallbacks:
 * 1. Use Electron preload-provided path if available
 * 2. Use Node.js path if available
 * 3. Use our robust browser-compatible implementation
 */
class PathPolyfill {
  constructor() {
    this.sep = '/';
    this.delimiter = ENV.isNodeJS ? ':' : ';';

    // Initialize if not already available
    this.initializePathModule();
  }

  initializePathModule() {
    if (ENV.isBrowser && !window.path) {
      window.path = this;
      console.log('PathPolyfill: Initialized window.path');
    }
  }

  /**
   * Robust path.join implementation
   */
  join(...args) {
    try {
      // Try using window.electron.path if available (from preload)
      if (window.electron?.path?.join) {
        return window.electron.path.join(...args);
      }

      // Fallback to our implementation
      return args
        .filter(arg => arg != null && arg !== '') // Remove null/undefined/empty segments
        .join('/')
        .replace(/\/{2,}/g, '/') // Replace multiple slashes with single one
        .replace(/\/$/g, ''); // Remove trailing slash
    } catch (err) {
      console.error('PathPolyfill: Error in path.join:', err);
      // Ultra-safe fallback
      return args
        .filter(arg => arg != null)
        .map(String)
        .join('/');
    }
  }

  /**
   * Robust path.resolve implementation
   */
  resolve(...args) {
    try {
      // Try using window.electron.path if available (from preload)
      if (window.electron?.path?.resolve) {
        return window.electron.path.resolve(...args);
      }

      // Fallback to our implementation
      let resolvedPath = '';
      let resolvedAbsolute = false;

      for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        const path = i >= 0 ? args[i] : process.cwd?.() || '/';

        // Skip empty entries
        if (!path) {
          continue;
        }

        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = path.charAt(0) === '/';
      }

      // Clean up path by handling '.' and '..'
      const segments = resolvedPath.split('/').filter(Boolean);
      const stack = [];

      for (const segment of segments) {
        if (segment === '.') {
          continue;
        } else if (segment === '..') {
          if (stack.length > 0 && stack[stack.length - 1] !== '..') {
            stack.pop();
          } else if (!resolvedAbsolute) {
            stack.push('..');
          }
        } else {
          stack.push(segment);
        }
      }

      // Ensure leading slash for absolute paths
      return (resolvedAbsolute ? '/' : '') + stack.join('/') || '.';
    } catch (err) {
      console.error('PathPolyfill: Error in path.resolve:', err);
      // Ultra-safe fallback
      return args.filter(Boolean).join('/') || '/';
    }
  }

  /**
   * Robust path.dirname implementation
   */
  dirname(path) {
    try {
      // Try using window.electron.path if available (from preload)
      if (window.electron?.path?.dirname) {
        return window.electron.path.dirname(path);
      }

      if (!path || typeof path !== 'string') {
        return '.';
      }

      // Strip trailing slashes
      path = path.replace(/\/+$/, '');

      // Edge cases
      if (path === '') return '.';
      if (path === '/') return '/';

      const lastSlashIndex = path.lastIndexOf('/');
      if (lastSlashIndex === -1) {
        return '.';
      }

      if (lastSlashIndex === 0) {
        return '/';
      }

      return path.slice(0, lastSlashIndex);
    } catch (err) {
      console.error('PathPolyfill: Error in path.dirname:', err);
      return '.';
    }
  }

  /**
   * Robust path.basename implementation
   */
  basename(path, ext) {
    try {
      // Try using window.electron.path if available (from preload)
      if (window.electron?.path?.basename) {
        return window.electron.path.basename(path, ext);
      }

      if (!path || typeof path !== 'string') {
        return '';
      }

      // Handle trailing slashes
      path = path.replace(/\/+$/, '');

      // Get the last part of the path
      const lastSegment = path.split('/').pop() || '';

      // Remove extension if specified and it matches
      if (ext && lastSegment.endsWith(ext)) {
        return lastSegment.slice(0, -ext.length);
      }

      return lastSegment;
    } catch (err) {
      console.error('PathPolyfill: Error in path.basename:', err);
      return '';
    }
  }

  /**
   * Robust path.extname implementation
   */
  extname(path) {
    try {
      // Try using window.electron.path if available (from preload)
      if (window.electron?.path?.extname) {
        return window.electron.path.extname(path);
      }

      if (!path || typeof path !== 'string') {
        return '';
      }

      // Get basename to handle paths correctly
      const basename = this.basename(path);

      // Find last dot
      const lastDotIndex = basename.lastIndexOf('.');

      // If no dot or it's the first character, no extension
      if (lastDotIndex <= 0) {
        return '';
      }

      return basename.slice(lastDotIndex);
    } catch (err) {
      console.error('PathPolyfill: Error in path.extname:', err);
      return '';
    }
  }

  /**
   * Normalize a path (remove redundant segments)
   */
  normalize(path) {
    try {
      // Try using window.electron.path if available (from preload)
      if (window.electron?.path?.normalize) {
        return window.electron.path.normalize(path);
      }

      if (!path || typeof path !== 'string') {
        return '.';
      }

      // Replace backslashes with forward slashes for Windows paths
      path = path.replace(/\\/g, '/');

      // Handle absolute paths specially
      const isAbsolute = path.startsWith('/');

      // Split the path, filter out empty segments and handle . and ..
      const segments = path.split('/').filter(Boolean);
      const result = [];

      for (const segment of segments) {
        if (segment === '.') {
          continue;
        } else if (segment === '..') {
          if (result.length && result[result.length - 1] !== '..') {
            result.pop();
          } else if (!isAbsolute) {
            result.push('..');
          }
        } else {
          result.push(segment);
        }
      }

      // Handle empty result
      if (!result.length && !isAbsolute) {
        return '.';
      }

      // Re-add leading slash for absolute paths
      return (isAbsolute ? '/' : '') + result.join('/');
    } catch (err) {
      console.error('PathPolyfill: Error in path.normalize:', err);
      return path;
    }
  }
}

// Initialize the path polyfill if needed
const pathPolyfill = new PathPolyfill();

// Export path if using ES modules
if (typeof exports !== 'undefined') {
  exports.path = pathPolyfill;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = pathPolyfill;
}

// Monitor path availability
if (ENV.isBrowser) {
  // Monitor path availability in window object over time
  // This helps detect if something removes or replaces our path implementation
  const pathCheckInterval = setInterval(() => {
    if (!window.path) {
      console.warn('PathPolyfill: window.path disappeared, restoring...');
      window.path = pathPolyfill;
    } else if (typeof window.path.join !== 'function') {
      console.warn('PathPolyfill: window.path.join is missing, restoring...');
      window.path = pathPolyfill;
    }
  }, 5000);

  // Clear interval on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(pathCheckInterval);
  });
}

console.log('Enhanced polyfills loaded successfully');
