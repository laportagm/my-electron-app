/**
 * Comprehensive Vite configuration for Electron application
 * This file handles both development and production environments,
 * properly managing Node.js modules in Electron's main and renderer processes.
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron-renderer';
import { builtinModules } from 'module';

// Log environment for debugging
console.log('Vite environment:', {
  NODE_ENV: process.env.NODE_ENV,
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  dirname: __dirname
});

// Create a list of all Node.js built-in modules
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

/**
 * Node.js polyfills plugin
 * This plugin provides browser-compatible replacements for Node.js built-in modules.
 * It prioritizes using the Electron bridge API when available, falling back to simplified
 * implementations when running in pure browser environments.
 */
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
    
    // OS module polyfill
    if (id === 'virtual:os-polyfill') {
      return `
        const osPolyfill = {
          platform: () => {
            if (typeof window !== 'undefined' && window.electron?.os?.platform) {
              return window.electron.os.platform();
            }
            // Browser platform detection fallback
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('win')) return 'win32';
            if (userAgent.includes('mac')) return 'darwin';
            if (userAgent.includes('linux')) return 'linux';
            return 'browser';
          },
          homedir: () => {
            if (typeof window !== 'undefined' && window.electron?.os?.homedir) {
              return window.electron.os.homedir();
            }
            return '/';
          },
          tmpdir: () => {
            if (typeof window !== 'undefined' && window.electron?.os?.tmpdir) {
              return window.electron.os.tmpdir();
            }
            return '/tmp';
          }
        };
        
        // Export both as default and named exports for compatibility
        export const {platform, homedir, tmpdir} = osPolyfill;
        export default osPolyfill;
      `;
    }
    
    // Other Node.js modules - provide minimal stubs or use electron bridge when available
    if (id.startsWith('virtual:') && id.endsWith('-polyfill')) {
      const moduleName = id.slice(8, -8); // Extract module name
      
      // Special case for electron module
      if (moduleName === 'electron') {
        return `
          // Electron module is not available in browser, only in Electron preload/main
          console.warn('Direct electron imports are not available in the browser environment. Use window.electron bridge instead.');
          
          // Return empty objects to prevent crashes
          export const app = {};
          export const ipcRenderer = {};
          export const contextBridge = {};
          export const dialog = {};
          export const shell = {};
          
          // Default export 
          const electronStub = { app, ipcRenderer, contextBridge, dialog, shell };
          export default electronStub;
        `;
      }
      
      // Generic minimal stub for other modules
      return `
        console.warn('${moduleName} is not fully supported in browser environment - using minimal polyfill');
        const ${moduleName}Polyfill = {};
        export default ${moduleName}Polyfill;
      `;
    }
    
    return null;
  }
};

/**
 * Environment-specific configuration plugin
 * Handles different settings between development and production
 */
const environmentPlugin = {
  name: 'vite-plugin-electron-environment',
  configResolved(config: any) {
    console.log(`Vite configuration resolved, mode: ${config.mode}`);
  },
  transformIndexHtml(html: string) {
    // Add environment-specific scripts to index.html
    return html.replace(
      '</head>',
      `<script>
        console.log('Renderer process initialized in ${process.env.NODE_ENV || 'development'} mode');
        // Global error handler to catch path-related errors 
        window.addEventListener('error', (event) => {
          if (event.error && event.error.message && event.error.message.includes('path.join')) {
            console.error('Path module error detected. Make sure you are using window.electron.path instead.');
          }
        });
      </script></head>`
    );
  }
};

// Main Vite configuration
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './', // Set base to relative path for proper asset loading in production
  publicDir: resolve(__dirname, 'public'),
  
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split chunks to improve loading performance
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/drei', '@react-three/fiber']
        }
      },
      // Exclude Node.js modules from the bundle - they'll be provided by Electron
      external: allNodeModules
    }
  },
  
  resolve: {
    alias: {
      // Path aliases for cleaner imports
      '@': resolve(__dirname, 'src/renderer'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@llm': resolve(__dirname, 'src/renderer/llm'),
      '@database': resolve(__dirname, 'src/main/database'),
      // Special alias for path module to use our polyfill
      'path': process.env.NODE_ENV === 'production' ? 'virtual:path-polyfill' : 'path',
      'fs': process.env.NODE_ENV === 'production' ? 'virtual:fs-polyfill' : 'fs',
      'os': process.env.NODE_ENV === 'production' ? 'virtual:os-polyfill' : 'os'
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    // Prioritize browser field in package.json for web compatibility
    mainFields: ['browser', 'module', 'main']
  },
  
  plugins: [
    // Apply Node.js polyfills plugin first so it can intercept Node module imports
    nodePolyfillsPlugin,
    
    // Environment-specific configuration
    environmentPlugin,
    
    // React plugin for JSX/TSX support
    react(),
    
    // Electron integration plugin
    electron({
      renderer: {
        nodeIntegration: true
      }
    })
  ],
  
  define: {
    // Define global constants and environment variables
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__dirname': JSON.stringify(__dirname),
    'global': 'globalThis',
    // Add flags to help code detect environment
    '__IS_DEV__': process.env.NODE_ENV !== 'production',
    '__IS_ELECTRON__': true,
    // Set process.type for environment detection in renderer
    'process.type': '"renderer"'
  },
  
  css: {
    postcss: resolve(__dirname, 'postcss.config.cjs')
  },
  
  optimizeDeps: {
    // Dependencies to pre-bundle for better performance
    include: [
      'react', 
      'react-dom', 
      'three', 
      'zustand', 
      '@react-three/fiber', 
      '@react-three/drei'
    ],
    // Exclude Node.js modules from dependency optimization
    exclude: allNodeModules,
    esbuildOptions: {
      // Native Node.js modules need special handling
      define: {
        global: 'globalThis'
      }
    }
  },
  
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    // Ensure HMR works properly for fast development
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    },
    // Watch for changes in non-renderer code too
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**']
    }
  }
});