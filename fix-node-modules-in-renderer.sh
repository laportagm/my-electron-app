#!/bin/bash

echo "🔧 Fixing Vite Node.js module externalization issues..."

# Create a preload helper in the renderer
cat > src/renderer/utils/nodeModules.ts << 'EOL'
/**
 * Safe access to Node.js modules in the renderer process
 * 
 * These are exposed via the preload script and window.electron
 */

// Path module safe methods
export const path = {
  join: (...args: string[]): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.join(...args);
    }
    // Fallback implementation for browser preview
    return args.join('/').replace(/\/+/g, '/');
  },
  
  resolve: (...args: string[]): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.resolve(...args);
    }
    // Fallback implementation
    return '/' + args.join('/').replace(/\/+/g, '/');
  },

  dirname: (pathString: string): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.dirname(pathString);
    }
    // Fallback implementation
    const parts = pathString.split('/');
    parts.pop();
    return parts.join('/') || '/';
  },

  basename: (pathString: string, ext?: string): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.basename(pathString, ext);
    }
    // Fallback implementation
    const base = pathString.split('/').pop() || '';
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  }
};

// FS module safe methods
export const fs = {
  existsSync: (path: string): boolean => {
    if (window.electron && window.electron.fs) {
      return window.electron.fs.existsSync(path);
    }
    // Fallback for browser (always false)
    return false;
  },
  
  readFile: async (path: string): Promise<string> => {
    if (window.electron) {
      return window.electron.readFile(path);
    }
    throw new Error('File system not available in browser');
  },
  
  writeFile: async (path: string, data: string): Promise<boolean> => {
    if (window.electron) {
      return window.electron.writeFile(path, data);
    }
    throw new Error('File system not available in browser');
  }
};

// OS module safe methods
export const os = {
  platform: (): string => {
    if (window.electron && window.electron.os) {
      return window.electron.os.platform();
    }
    // Fallback for browser
    return 'browser';
  },
  
  homedir: (): string => {
    if (window.electron && window.electron.os) {
      return window.electron.os.homedir();
    }
    // Fallback for browser
    return '/';
  }
};
EOL

# Now update the config.ts file to use the safe modules
CONFIG_FILE="src/utils/config.ts"
CONFIG_BACKUP="src/utils/config.ts.backup"

# Backup the original file
cp "$CONFIG_FILE" "$CONFIG_BACKUP"

# Read the file content
CONFIG_CONTENT=$(cat "$CONFIG_FILE")

# Replace direct path import with our safe version
CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed 's/import \* as path from "path";/import { path } from "..\/renderer\/utils\/nodeModules";/')
CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed 's/import path from "path";/import { path } from "..\/renderer\/utils\/nodeModules";/')

# Replace any fs imports
CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed 's/import \* as fs from "fs";/import { fs } from "..\/renderer\/utils\/nodeModules";/')
CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed 's/import fs from "fs";/import { fs } from "..\/renderer\/utils\/nodeModules";/')

# Write the updated content back
echo "$CONFIG_CONTENT" > "$CONFIG_FILE"

# Update vite.config.js to handle node polyfills better
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
      external: ['electron'],
    },
  },
});
EOL

echo "✅ Fixed Node.js module externalization issues!"
echo "   The application now safely accesses Node.js modules through the preload bridge."
