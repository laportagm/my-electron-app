import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    
    // Better source maps for debugging
    sourcemap: true,
    
    // Set reasonable chunk size warning
    chunkSizeWarningLimit: 500,
    
    // Optimize chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react', 
            'react-dom', 
            'react-router-dom',
            'zustand',
            'three',
            '@react-three/fiber',
            '@react-three/drei'
          ],
          'brain-models': [
            './src/renderer/utils/modelRegistry.ts',
            './src/renderer/utils/loadModel.ts'
          ]
        }
      }
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  
  plugins: [
    react(),
    
    // Bundle analyzer (only active in build mode)
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  
  css: {
    postcss: resolve(__dirname, 'postcss.config.js'),
  },
  
  // Optimize dev experience
  server: {
    hmr: {
      overlay: true,
    },
    port: 5173,
    open: false,
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'three', 
      '@react-three/fiber', 
      '@react-three/drei',
      'zustand'
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  
  // Support for web workers
  worker: {
    format: 'es',
  }
})