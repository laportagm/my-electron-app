#!/bin/bash

echo "=== FIXING VITE STATIC FILE HANDLING FOR DEVELOPMENT ==="

# Create a public directory link in src/renderer/public for better asset resolution
echo "Creating symlinks to help Vite resolve public assets..."

# Make sure src/renderer/public exists
mkdir -p src/renderer/public

# Create symlinks to public directory contents if they don't exist
if [ ! -L "src/renderer/public/assets" ]; then
  ln -s ../../../public/assets src/renderer/public/assets
  echo "✅ Created symlink for assets directory"
fi

if [ ! -L "src/renderer/public/draco" ]; then
  ln -s ../../../public/draco src/renderer/public/draco
  echo "✅ Created symlink for draco directory"
fi

# Update vite.config.js to explicitly set publicDir
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
  // Increase chunk size warning limit to avoid noise
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    watch: {
      // Also watch the public directory for changes
      ignored: ['!**/public/**']
    }
  }
})
EOL

echo "✅ Updated vite.config.js to improve static file handling"

echo "=== SETUP COMPLETE ==="
echo "Run npm run dev to start the application."