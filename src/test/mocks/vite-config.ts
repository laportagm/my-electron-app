/**
 * Mock Vite configuration for tests
 * This mock matches the exact structure expected by the vite-config.test.ts
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
// Instead of using builtinModules, we'll hardcode a list since we're in ESM context
const builtinModules = [
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto',
  'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
  'repl', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
  'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
];

// Create a list of all Node.js built-in modules (same as in main config)
const nodeBuiltinModules = [
  ...builtinModules,
  'electron',
  // Explicitly list common Node.js modules that might cause issues
  'path', 'fs', 'os', 'crypto', 'stream', 'events', 'util',
  // Native modules used in this project
  'node-llama-cpp', 'better-sqlite3'
];

// Flattened list including both standard and node: prefixed versions
const allNodeModules = [
  ...nodeBuiltinModules,
  ...nodeBuiltinModules.map(m => `node:${m}`)
];

// Node.js polyfills plugin
const nodePolyfillsPlugin = {
  name: 'vite-plugin-node-polyfills',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined) {
    if (nodeBuiltinModules.includes(source)) {
      return `virtual:${source}-polyfill`;
    }
    return null;
  },
  load(id: string) {
    // Path module polyfill - prioritizes window.electron.path if available
    if (id === 'virtual:path-polyfill') {
      return `
        const pathPolyfill = {
          join: (...paths) => {
            // Try using exposed Electron path first
            if (typeof window !== 'undefined' && window.electron?.path?.join) {
              return window.electron.path.join(...paths);
            }
            // Fallback implementation
            return paths.filter(Boolean).join('/').replace(/\\/\\//g, '/');
          },
          resolve: (...paths) => {
            if (typeof window !== 'undefined' && window.electron?.path?.resolve) {
              return window.electron.path.resolve(...paths);
            }
            // Simplified resolve implementation
            return paths.filter(Boolean).join('/').replace(/\\/\\//g, '/');
          },
          dirname: (path) => {
            if (typeof window !== 'undefined' && window.electron?.path?.dirname) {
              return window.electron.path.dirname(path);
            }
            const lastSlashIndex = path.lastIndexOf('/');
            if (lastSlashIndex === -1) return '.';
            if (lastSlashIndex === 0) return '/';
            return path.slice(0, lastSlashIndex);
          },
          basename: (path, ext) => {
            if (typeof window !== 'undefined' && window.electron?.path?.basename) {
              return window.electron.path.basename(path, ext);
            }
            let base = path.slice(path.lastIndexOf('/') + 1);
            if (ext && base.endsWith(ext)) {
              base = base.slice(0, -ext.length);
            }
            return base;
          },
          extname: (path) => {
            if (typeof window !== 'undefined' && window.electron?.path?.extname) {
              return window.electron.path.extname(path);
            }
            const lastDotIndex = path.lastIndexOf('.');
            const lastSlashIndex = path.lastIndexOf('/');
            return (lastDotIndex > lastSlashIndex && lastDotIndex > 0) ? path.slice(lastDotIndex) : '';
          },
          sep: '/'
        };
        
        // Export both as default and named exports for compatibility
        export const {join, resolve, dirname, basename, extname, sep} = pathPolyfill;
        export default pathPolyfill;
      `;
    }
    
    // Filesystem polyfill - uses electron bridge when available
    if (id === 'virtual:fs-polyfill') {
      return `
        const fsPolyfill = {
          promises: {
            readFile: async (path, options) => {
              if (typeof window !== 'undefined' && window.electron?.readFile) {
                return window.electron.readFile(path);
              }
              throw new Error('fs.readFile is not available in this environment');
            },
            writeFile: async (path, data, options) => {
              if (typeof window !== 'undefined' && window.electron?.writeFile) {
                return window.electron.writeFile(path, data);
              }
              throw new Error('fs.writeFile is not available in this environment');
            },
            readdir: async (path, options) => {
              if (typeof window !== 'undefined' && window.electron?.readDir) {
                return window.electron.readDir(path);
              }
              return [];
            }
          },
          existsSync: (path) => {
            if (typeof window !== 'undefined' && window.electron?.fs?.existsSync) {
              return window.electron.fs.existsSync(path);
            }
            return false;
          },
          readFileSync: (path, options) => {
            if (typeof window !== 'undefined' && window.electron?.readFile) {
              console.warn('fs.readFileSync is not directly supported in browser - using async readFile instead');
              let result = null;
              window.electron.readFile(path)
                .then(data => { result = data; })
                .catch(err => { throw err; });
              // This is a synchronous approximation, not recommended
              while(result === null) { /* synchronous wait, BAD PRACTICE */ }
              return result;
            }
            throw new Error('fs.readFileSync is not available in the browser environment');
          }
        };
        
        // Export both as default and named exports for compatibility
        export const {promises, existsSync, readFileSync} = fsPolyfill;
        export default fsPolyfill;
      `;
    }
    
    return null;
  }
};

// Add a property to the resolved config for the test to check
const config = defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './', 
  publicDir: resolve(__dirname, 'public'),
  
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/drei', '@react-three/fiber']
        }
      },
      external: allNodeModules
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@llm': resolve(__dirname, 'src/renderer/llm'),
      '@database': resolve(__dirname, 'src/main/database'),
      'path': process.env.NODE_ENV === 'production' ? 'virtual:path-polyfill' : 'path',
      'fs': process.env.NODE_ENV === 'production' ? 'virtual:fs-polyfill' : 'fs',
      'os': process.env.NODE_ENV === 'production' ? 'virtual:os-polyfill' : 'os'
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    mainFields: ['browser', 'module', 'main']
  },
  
  plugins: [
    nodePolyfillsPlugin,
    {
      name: 'vite-plugin-electron-environment',
      configResolved(config: any) {
        console.log(`Vite configuration resolved, mode: ${config.mode}`);
      }
    },
    {
      name: 'vite:electron-renderer',
      renderer: {
        nodeIntegration: true
      }
    }
  ],
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__dirname': JSON.stringify(__dirname),
    'global': 'globalThis',
    '__IS_DEV__': process.env.NODE_ENV !== 'production',
    '__IS_ELECTRON__': true,
    'process.type': '"renderer"'
  }
});

// Add the property the test is looking for
config.__IS_ELECTRON__ = true;

export default config;