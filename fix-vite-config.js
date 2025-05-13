/**
 * Script to fix Vite configuration issues for Electron integration
 * This script:
 * 1. Backs up the current vite.config.ts
 * 2. Creates an optimized version of vite.config.ts to handle Node.js module issues
 * 3. Updates preload script compilation for development
 * 4. Adds global path error handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing Vite configuration for proper Electron integration...');

// -----------------------------------------------
// Backup and update vite.config.ts
// -----------------------------------------------

// Path to the configuration file
const viteConfigPath = path.join(__dirname, 'vite.config.ts');

// Create backup of original configuration
if (fs.existsSync(viteConfigPath)) {
  const backupPath = `${viteConfigPath}.backup`;
  fs.copyFileSync(viteConfigPath, backupPath);
  console.log(`✅ Created backup of original vite.config.ts at ${backupPath}`);
}

// Get the optimized vite.config.ts - this file is already written separately with extensive comments

// -----------------------------------------------
// Create compile-preload-dev script for development
// -----------------------------------------------

const compilePreloadDevPath = path.join(__dirname, 'compile-preload-dev.js');
const compilePreloadDevContent = `/**
 * Development script to compile preload.ts for hot-reloading
 * This script:
 * 1. Compiles the preload script using TypeScript
 * 2. Outputs it to the development location
 * 3. Sets up CommonJS format
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Compiling preload script for development...');

try {
  // Create main preload script directory if it doesn't exist
  const preloadDir = path.join(__dirname, 'src', 'main', 'preload');
  if (!fs.existsSync(preloadDir)) {
    fs.mkdirSync(preloadDir, { recursive: true });
  }
  
  // Determine source file - use preload.ts from preload directory if it exists, otherwise use main directory
  let sourceFile = path.join(__dirname, 'src', 'main', 'preload', 'preload.ts');
  if (!fs.existsSync(sourceFile)) {
    sourceFile = path.join(__dirname, 'src', 'main', 'preload.ts');
  }
  
  // Compile main preload.ts
  console.log(\`📦 Compiling \${sourceFile}...\`);
  
  // Use TypeScript compiler for preload script
  execSync(
    \`tsc \${sourceFile} --outDir \${path.join(__dirname, 'src', 'main')} --target ES2018 --module CommonJS\`, 
    { stdio: 'inherit' }
  );
  
  // Also compile to src/main/preload directory with proper extensions
  execSync(
    \`tsc \${sourceFile} --outDir \${path.join(__dirname, 'src', 'main', 'preload')} --target ES2018 --module CommonJS\`, 
    { stdio: 'inherit' }
  );
  
  // Create a .d.ts file for TypeScript
  execSync(
    \`tsc \${sourceFile} --declaration --emitDeclarationOnly --outDir \${path.join(__dirname, 'src', 'main', 'preload')}\`, 
    { stdio: 'inherit' }
  );
  
  // Also create an ESM version for compatibility
  const esmDir = path.join(__dirname, 'src', 'main', 'preload');
  const esmFilePath = path.join(esmDir, 'preload-esm.ts');
  
  // Read the original file
  const content = fs.readFileSync(sourceFile, 'utf8');
  
  // Add ESM comment at the top
  const esmContent = '// ESM version of preload script for development environments\\n' + content;
  
  // Write the ESM version
  fs.writeFileSync(esmFilePath, esmContent);
  execSync(
    \`tsc \${esmFilePath} --outDir \${esmDir} --target ES2020 --module ESNext\`, 
    { stdio: 'inherit' }
  );
  
  console.log('✅ Preload script compilation complete!');
  console.log('  📄 CommonJS version: src/main/preload.js');
  console.log('  📄 ESM version: src/main/preload/preload-esm.js');
  
} catch (error) {
  console.error('❌ Error compiling preload script:', error);
  process.exit(1);
}
`;

fs.writeFileSync(compilePreloadDevPath, compilePreloadDevContent);
console.log(`✅ Created improved compile-preload-dev.js script`);

// -----------------------------------------------
// Setup polyfills.js for browser compatibility
// -----------------------------------------------

const polyfillsDir = path.join(__dirname, 'src', 'renderer');
const polyfillsPath = path.join(polyfillsDir, 'polyfills.js');

const polyfillsContent = `/**
 * Browser polyfills for Node.js modules
 * These polyfills help make code that uses Node.js modules compatible with the browser environment
 */

// Path module polyfill
export const path = {
  join: (...paths) => {
    // Try using exposed Electron path first
    if (typeof window !== 'undefined' && window.electron?.path?.join) {
      return window.electron.path.join(...paths);
    }
    // Fallback implementation
    return paths.filter(Boolean).join('/').replace(/\/\//g, '/');
  },
  resolve: (...paths) => {
    if (typeof window !== 'undefined' && window.electron?.path?.resolve) {
      return window.electron.path.resolve(...paths);
    }
    // Simplified resolve implementation
    return paths.filter(Boolean).join('/').replace(/\/\//g, '/');
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

// Browser environment detection helpers
export const isRenderer = typeof process !== 'undefined' && 
  process.type === 'renderer';

export const isBrowser = typeof window !== 'undefined' && 
  typeof process === 'undefined';

export const isElectron = typeof window !== 'undefined' && 
  window.electron !== undefined;

// Common utility to safely get path-related functionality across environments
export const getPathUtils = () => {
  // First priority: window.electron bridge if available
  if (typeof window !== 'undefined' && window.electron?.path) {
    return window.electron.path;
  }
  
  // Second priority: direct Node.js path if available (main process)
  if (typeof process !== 'undefined' && process.type !== 'renderer') {
    try {
      return require('path');
    } catch (e) {
      // Silently fail and use polyfill
    }
  }
  
  // Last resort: our polyfill implementation
  return path;
};

// Setup global error handler to catch path-related errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message) {
      const errorMsg = event.error.message.toLowerCase();
      
      // Detect path-related errors
      if (
        errorMsg.includes('path.join') || 
        errorMsg.includes('is not a function') ||
        (errorMsg.includes('path') && errorMsg.includes('undefined'))
      ) {
        console.error(
          '%c Path module error detected! 🛑',
          'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
          '\\nUse window.electron.path or the polyfills.js utilities instead of direct Node.js imports.',
          '\\nError:', event.error
        );
      }
    }
  });
}

// Export default object for compatibility with different import styles
export default {
  path,
  isRenderer,
  isBrowser,
  isElectron,
  getPathUtils
};
`;

fs.writeFileSync(polyfillsPath, polyfillsContent);
console.log(`✅ Created renderer polyfills.js for browser compatibility`);

// -----------------------------------------------
// Create TypeScript declarations for polyfills
// -----------------------------------------------

const polyfillsDtsPath = path.join(polyfillsDir, 'polyfills.d.ts');
const polyfillsDtsContent = `/**
 * Type definitions for browser polyfills
 */

export interface PathModule {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  dirname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
  extname: (path: string) => string;
  sep: string;
}

export const path: PathModule;
export const isRenderer: boolean;
export const isBrowser: boolean;
export const isElectron: boolean;
export const getPathUtils: () => PathModule;

export default {
  path: PathModule;
  isRenderer: boolean;
  isBrowser: boolean;
  isElectron: boolean;
  getPathUtils: () => PathModule;
};
`;

fs.writeFileSync(polyfillsDtsPath, polyfillsDtsContent);
console.log(`✅ Created TypeScript definitions for polyfills.d.ts`);

// -----------------------------------------------
// Update electron.d.ts with better definitions
// -----------------------------------------------

const electronDtsPath = path.join(__dirname, 'src', 'renderer', 'electron.d.ts');
const electronDtsContent = `/**
 * TypeScript definitions for Electron preload API
 * This file defines the window.electron interface
 */

interface ElectronPathAPI {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  dirname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
  extname: (path: string) => string;
  sep: string;
}

interface ElectronFsAPI {
  existsSync: (path: string) => boolean;
}

interface ElectronOsAPI {
  platform: () => string;
  homedir: () => string;
  tmpdir: () => string;
}

interface ElectronAPI {
  // App information
  isPackaged: boolean;
  
  // IPC communication
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  
  // Node.js modules
  path: ElectronPathAPI;
  fs: ElectronFsAPI;
  os: ElectronOsAPI;
  
  // Custom IPC wrappers for file system access
  getPath: (name: string) => Promise<string>;
  readDir: (path: string) => Promise<string[]>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
  
  // Logging
  log: (level: string, message: string) => void;
}

// Add TypeScript support for window.electron
declare global {
  interface Window {
    electron: ElectronAPI;
    path: ElectronPathAPI; // For direct window.path access
  }
}

export {};
`;

fs.writeFileSync(electronDtsPath, electronDtsContent);
console.log(`✅ Created improved electron.d.ts TypeScript definitions`);

// -----------------------------------------------
// Update package.json scripts
// -----------------------------------------------

const packageJsonPath = path.join(__dirname, 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Backup package.json
  fs.writeFileSync(`${packageJsonPath}.backup`, JSON.stringify(packageJson, null, 2));
  
  // Update scripts for better development experience
  packageJson.scripts = {
    ...packageJson.scripts,
    // Update development scripts to use the new preload compiler
    "dev:preload": "node compile-preload-dev.js",
    "dev:electron": "npm run dev:preload && wait-on http://localhost:5173 && cross-env NODE_ENV=development electron electron-dev.cjs",
    // Add script to fix path related issues
    "fix:path": "node fix-vite-config.js && echo 'Path resolution fix applied - reload the application'"
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`✅ Updated package.json scripts for better development workflow`);
} catch (error) {
  console.error(`❌ Error updating package.json:`, error);
}

// -----------------------------------------------
// Update start-dev.sh for better development experience
// -----------------------------------------------

const startDevPath = path.join(__dirname, 'start-dev.sh');
const startDevContent = `#!/bin/bash
# Enhanced development startup script
# This script:
# 1. Compiles the preload script for development
# 2. Starts the Vite dev server for the renderer
# 3. Starts the Electron process with HMR

echo "🚀 Starting development environment..."

# Ensure the script is executable
chmod +x "$0"

# Ensure Vite dev server is not already running
pkill -f "vite.*--port 5173" || true

# Compile preload script for development
echo "🔧 Compiling preload script..."
node compile-preload-dev.js

# Start the Vite dev server for renderer
echo "🌐 Starting Vite dev server..."
npm run dev:renderer &
VITE_PID=$!

# Wait for the Vite dev server to be ready
echo "⏳ Waiting for Vite dev server..."
npx wait-on http://localhost:5173

# Start the Electron process
echo "⚛️ Starting Electron..."
cross-env NODE_ENV=development electron electron-dev.cjs

# Cleanup by killing the Vite dev server
kill $VITE_PID
`;

fs.writeFileSync(startDevPath, startDevContent);
execSync(`chmod +x ${startDevPath}`);
console.log(`✅ Created improved start-dev.sh script`);

console.log('\n🎉 All fixes have been applied successfully!\n');
console.log('Next steps:');
console.log('1. Start the development server with: npm run dev');
console.log('2. If you still encounter path issues, check that components are using window.electron.path');
console.log('3. For renderer code, import the path utilities from polyfills.js\n');