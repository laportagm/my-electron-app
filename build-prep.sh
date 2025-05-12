#!/bin/bash

echo "=== Preparing build environment ==="

# 1. Remove any existing symlinks to prevent circular references
echo "Removing all symlinks..."
find ./src/renderer -type l -delete
find ./public -type l -delete

# 2. Ensure clean structure for assets
echo "Setting up clean model structure..."
mkdir -p dist/renderer/assets/models
mkdir -p dist/renderer/draco

# 3. Copy models directly to public folder for development
echo "Copying models to public folder..."
cp -v public/assets/models/*.glb src/renderer/assets/models/ 2>/dev/null || echo "No models to copy"

# 4. Copy Draco decoders for development
echo "Copying Draco decoders..."
cp -r public/draco/* src/renderer/draco/ 2>/dev/null || echo "No Draco decoders to copy"

# 5. Fix vite.config.js to handle static assets properly
echo "Updating Vite config for proper static asset handling..."

# Create a backup of vite.config.js
cp vite.config.js vite.config.js.backup

# Update vite.config.js for proper build
cat > vite.config.js << EOL
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'three'],
          'three-extras': [
            'three/examples/jsm/loaders/GLTFLoader.js',
            'three/examples/jsm/loaders/DRACOLoader.js'
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
    react()
  ],
  css: {
    postcss: resolve(__dirname, 'postcss.config.js'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three']
  }
})
EOL

echo "===== Build preparation complete ====="
echo "You can now run: npm run build"