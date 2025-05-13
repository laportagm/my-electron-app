#!/bin/bash

echo "🔧 Installing and configuring React Three Fiber dependencies..."

# Step 1: Install the missing packages
echo "📦 Installing @react-three/fiber and related dependencies..."
npm install @react-three/fiber @react-three/drei three

# Step 2: Fix any version conflicts
echo "🔄 Ensuring compatible versions..."
npm install three@latest

# Step 3: Update Vite configuration to properly handle Three.js
echo "⚙️ Updating Vite configuration for Three.js support..."

# Create a backup of the existing vite.config.js
cp vite.config.js vite.config.js.backup

# Update vite.config.js to properly handle Three.js
cat > vite.config.js << 'EOL'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'three': 'three',
      '@react-three/fiber': '@react-three/fiber',
      '@react-three/drei': '@react-three/drei'
    }
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
    },
  },
});
EOL

echo "✅ Dependencies installed and configured! You can now run your application."
echo "   Start the app with: npm run dev"
