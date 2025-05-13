
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

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/drei', '@react-three/fiber']
        }
      },
      external: [
        'electron',
        'fs',
        'path',
        'os',
        'node-llama-cpp',
        'better-sqlite3',
        ...builtinModules.flatMap(m => [m, `node:${m}`])
      ]
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@llm': resolve(__dirname, 'src/renderer/llm'),
      '@database': resolve(__dirname, 'src/main/database')
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
  },
  
  plugins: [
    react(),
    electron({
      renderer: {
        nodeIntegration: true
      }
    }),
    // Custom plugin to handle node module externalization
    {
      name: 'node-polyfills',
      enforce: 'pre',
      resolveId(source, importer) {
        // Create shims for Node.js built-in modules
        const nodeBuiltins = ['path', 'fs', 'os', 'crypto'];
        if (nodeBuiltins.includes(source)) {
          return `virtual:${source}-polyfill`;
        }
        return null;
      },
      load(id) {
        if (id.startsWith('virtual:path-polyfill')) {
          return `
            export function join(...paths) { return paths.join('/'); }
            export function resolve(...paths) { return paths.join('/'); }
            export function dirname(path) { return path.split('/').slice(0, -1).join('/'); }
            export function basename(path) { return path.split('/').pop(); }
            export default { join, resolve, dirname, basename };
          `;
        }
        if (id.startsWith('virtual:fs-polyfill')) {
          return `
            export const promises = {
              readFile: () => Promise.resolve(''),
              writeFile: () => Promise.resolve(),
              readdir: () => Promise.resolve([]),
            };
            export function existsSync() { return false; }
            export default { promises, existsSync };
          `;
        }
        if (id.startsWith('virtual:os-polyfill')) {
          return `
            export function platform() { return 'browser'; }
            export function homedir() { return '/'; }
            export default { platform, homedir };
          `;
        }
        if (id.startsWith('virtual:crypto-polyfill')) {
          return `
            export function randomBytes() { return new Uint8Array(0); }
            export default { randomBytes };
          `;
        }
        return null;
      }
    }
  ],
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__dirname': JSON.stringify(__dirname),
    'global': 'globalThis'
  },
  
  css: {
    postcss: resolve(__dirname, 'postcss.config.cjs')
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'three'],
    exclude: [
      'electron',
      'better-sqlite3',
      'node-llama-cpp',
      ...builtinModules.flatMap(m => [m, `node:${m}`])
    ]
  },
  
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  }
});
