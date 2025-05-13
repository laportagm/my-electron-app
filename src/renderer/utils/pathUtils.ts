/**
 * Safe path utilities for renderer process
 *
 * This provides a consistent API for path operations regardless of context
 * (main process, preload script, or renderer process)
 *
 * Version: 2.0
 * Features:
 * - Multi-layered fallback strategy
 * - Comprehensive error handling
 * - Compatible with all runtime environments
 * - Integrated with window.path and window.electron.path
 */

// Define PathAPI interface for consistent typing across implementations
interface PathAPI {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  dirname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
  extname: (path: string) => string;
  normalize: (path: string) => string;
  sep: string;
}

/**
 * Environment detection for better path handling
 */
const ENV = {
  isElectron: typeof window !== 'undefined' &&
    (window.electron !== undefined ||
     navigator.userAgent.toLowerCase().indexOf('electron') > -1),
  isBrowser: typeof window !== 'undefined',
  isNodeJS: typeof process !== 'undefined' && process.versions && process.versions.node,
  isTest: typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test'
};

/**
 * Get the best available path implementation using layered fallback strategy:
 * 1. window.electron.path (from preload) - most reliable in Electron
 * 2. window.path (polyfill or from preload)
 * 3. Node.js path module (if available)
 * 4. Our local implementation
 */
function getBestPathImplementation(): PathAPI {
  // Try to get electron.path first (most reliable in Electron context)
  if (typeof window !== 'undefined' && window.electron?.path) {
    const electronPath = window.electron.path;
    if (typeof electronPath.join === 'function') {
      console.log('PathUtils: Using window.electron.path implementation');
      return electronPath as unknown as PathAPI;
    }
  }

  // Try window.path (could be from polyfill.js or preload)
  if (typeof window !== 'undefined' && window.path) {
    const windowPath = window.path;
    if (typeof windowPath.join === 'function') {
      console.log('PathUtils: Using window.path implementation');
      return windowPath as unknown as PathAPI;
    }
  }

  // Try to import Node.js path if available
  let nodePath: typeof import('path') | null = null;
  try {
    // In Electron main process or Node.js environment
    nodePath = require('path');
    if (nodePath && typeof nodePath.join === 'function') {
      console.log('PathUtils: Using Node.js path implementation');
      return nodePath;
    }
  } catch (e) {
    // In browser context, nodePath remains null
    console.log('PathUtils: Node.js path not available, using local implementation');
  }

  // Return null to indicate we need to use our local implementation
  return null;
}

// Get the best path implementation or use our own
const pathImpl = getBestPathImplementation();

/**
 * Wraps a path function with error handling
 */
function wrapWithErrorHandling<T extends (...args: any[]) => string>(
  fn: T,
  fallbackFn: T,
  functionName: string
): T {
  return ((...args: any[]): string => {
    try {
      // Try the best implementation first
      if (pathImpl && typeof pathImpl[functionName] === 'function') {
        return pathImpl[functionName](...args);
      }

      // Fall back to our implementation
      return fallbackFn(...args);
    } catch (err) {
      console.error(`PathUtils: Error in ${functionName}:`, err);

      // Ultra-safe fallback implementation
      try {
        return fallbackFn(...args);
      } catch (innerErr) {
        console.error(`PathUtils: Error in fallback ${functionName}:`, innerErr);

        // Return reasonable defaults when all else fails
        if (functionName === 'dirname') return '.';
        if (functionName === 'basename') return '';
        if (functionName === 'extname') return '';
        if (functionName === 'normalize') return args[0] || '.';

        // For join and resolve, return simple joined path
        return args.filter(arg => arg != null).map(String).join('/');
      }
    }
  }) as T;
}

// ------------------------------------
// Local fallback implementations
// ------------------------------------

/**
 * Local fallback implementation of path.join
 */
function localJoin(...paths: string[]): string {
  return paths
    .filter(p => p != null && p !== '') // Remove null/empty segments
    .join('/')
    .replace(/\/{2,}/g, '/') // Replace multiple slashes with a single one
    .replace(/\/$/g, ''); // Remove trailing slash
}

/**
 * Local fallback implementation of path.resolve
 */
function localResolve(...paths: string[]): string {
  let resolvedPath = '';
  let resolvedAbsolute = false;

  for (let i = paths.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? paths[i] : process?.cwd?.() || '/';

    // Skip empty entries
    if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // Clean up path
  const segments = resolvedPath.split('/').filter(Boolean);
  const stack: string[] = [];

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
}

/**
 * Local fallback implementation of path.dirname
 */
function localDirname(path: string): string {
  if (!path || typeof path !== 'string') {
    return '.';
  }

  // Handle trailing slashes
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
}

/**
 * Local fallback implementation of path.basename
 */
function localBasename(path: string, ext?: string): string {
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
}

/**
 * Local fallback implementation of path.extname
 */
function localExtname(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Get basename
  const basename = localBasename(path);

  // Find last dot
  const lastDotIndex = basename.lastIndexOf('.');

  // If no dot or it's the first character, no extension
  if (lastDotIndex <= 0) {
    return '';
  }

  return basename.slice(lastDotIndex);
}

/**
 * Local fallback implementation of path.normalize
 */
function localNormalize(path: string): string {
  if (!path || typeof path !== 'string') {
    return '.';
  }

  // Replace backslashes with forward slashes for Windows paths
  path = path.replace(/\\/g, '/');

  // Handle absolute paths specially
  const isAbsolute = path.startsWith('/');

  // Split the path, filter out empty segments and handle . and ..
  const segments = path.split('/').filter(Boolean);
  const result: string[] = [];

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
}

// ------------------------------------
// Exported API with error handling
// ------------------------------------

/**
 * Safe implementation of path.join that works in any context
 */
export const join = wrapWithErrorHandling(
  (...paths: string[]): string => pathImpl.join(...paths),
  localJoin,
  'join'
);

/**
 * Safe implementation of path.resolve that works in any context
 */
export const resolve = wrapWithErrorHandling(
  (...paths: string[]): string => pathImpl.resolve(...paths),
  localResolve,
  'resolve'
);

/**
 * Safe implementation of path.dirname that works in any context
 */
export const dirname = wrapWithErrorHandling(
  (path: string): string => pathImpl.dirname(path),
  localDirname,
  'dirname'
);

/**
 * Safe implementation of path.basename that works in any context
 */
export const basename = wrapWithErrorHandling(
  (path: string, ext?: string): string => pathImpl.basename(path, ext),
  localBasename,
  'basename'
);

/**
 * Safe implementation of path.extname that works in any context
 */
export const extname = wrapWithErrorHandling(
  (path: string): string => pathImpl.extname(path),
  localExtname,
  'extname'
);

/**
 * Safe implementation of path.normalize that works in any context
 */
export const normalize = wrapWithErrorHandling(
  (path: string): string => pathImpl.normalize(path),
  localNormalize,
  'normalize'
);

/**
 * Path separator - always '/' for cross-platform consistency
 */
export const sep = pathImpl?.sep || '/';

// Export the full API
export default {
  join,
  resolve,
  dirname,
  basename,
  extname,
  normalize,
  sep
};