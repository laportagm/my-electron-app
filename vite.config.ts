import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron-renderer'
import { builtinModules } from 'module'

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
          three: ['three', '@react-three/drei', '@react-three/fiber'],
          ui: ['lucide-react'],
          markdown: ['react-markdown', 'remark-gfm']
        }
      },
      external: [
        'node-llama-cpp',
        'better-sqlite3'
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
  },
  plugins: [
    react(),
    electron({
      // Enables NodeJS API in renderer process
      renderer: {
        // Fix for __dirname not defined
        nodeIntegration: true,
      }
    })
  ],
  css: {
    postcss: resolve(__dirname, 'postcss.config.cjs'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', 'react-markdown', 'remark-gfm'],
    exclude: [
      'better-sqlite3',
      'node-llama-cpp',
      'electron',
      ...builtinModules.flatMap(m => [m, `node:${m}`]),
    ]
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})
