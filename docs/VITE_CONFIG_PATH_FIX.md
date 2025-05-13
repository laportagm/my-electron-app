# Vite Configuration Node.js Module Fix

This document explains the comprehensive fix for Vite configuration to handle Node.js module issues in Electron applications, specifically addressing the path module errors.

## Problem Overview

Electron applications face challenges with Node.js module resolution in the renderer process, especially with:

1. **Path module errors** - Common errors like `path.join is not a function` occur when Node.js modules are directly imported in renderer code
2. **Environment inconsistencies** - Code needs to run in both development and production with different module resolution strategies
3. **Module format differences** - Conflicts between ESM and CommonJS formats
4. **Preload script integration** - Ensuring the preload script properly exposes Node.js APIs

## Solution Components

The solution consists of multiple coordinated parts:

### 1. Enhanced Vite Configuration (`vite.config.ts`)

The new configuration:

- Creates proper module polyfills for Node.js built-ins
- Handles environment-specific settings for development/production
- Intercepts and manages imports of Node.js modules
- Sets up proper aliases for module resolution
- Configures external dependency handling

Key features:

```typescript
// Node modules polyfill plugin intercepts imports
const nodePolyfillsPlugin = {
  name: 'vite-plugin-node-polyfills',
  enforce: 'pre' as const,
  resolveId(source: string) {
    if (nodeBuiltinModules.includes(source)) {
      return `virtual:${source}-polyfill`;
    }
    return null;
  },
  // ...
};

// Special path handling in resolve.alias
resolve: {
  alias: {
    // Path aliases for cleaner imports
    '@': resolve(__dirname, 'src/renderer'),
    // ...
    // Special alias for path module to use our polyfill
    'path': process.env.NODE_ENV === 'production' ? 'virtual:path-polyfill' : 'path',
    'fs': process.env.NODE_ENV === 'production' ? 'virtual:fs-polyfill' : 'fs',
    'os': process.env.NODE_ENV === 'production' ? 'virtual:os-polyfill' : 'os'
  }
}
```

### 2. Browser Polyfills (`src/renderer/polyfills.js`)

Browser-compatible implementations of Node.js modules that:

- Prioritize using the Electron bridge API when available
- Provide fallback implementations for pure browser environments
- Include environment detection helpers
- Add global error handlers for path-related issues

```javascript
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
  // ...
};

// Environment detection helpers
export const isRenderer = typeof process !== 'undefined' && 
  process.type === 'renderer';

export const isBrowser = typeof window !== 'undefined' && 
  typeof process === 'undefined';

export const isElectron = typeof window !== 'undefined' && 
  window.electron !== undefined;
```

### 3. Improved Type Definitions

TypeScript definitions for better IDE support and type safety:

- `electron.d.ts` - Interface for window.electron API
- `polyfills.d.ts` - Type definitions for polyfill utilities

### 4. Preload Script Compilation

Enhanced preload script compilation for development:

- Supports both CommonJS and ESM modules
- Creates proper type definitions
- Enables hot reload during development

## Usage Guide

### For Application Code

1. **In renderer code, avoid direct Node.js imports**:

   ```typescript
   // ❌ Don't do this
   import path from 'path';
   
   // ✅ Instead, use the electron bridge
   const filePath = window.electron.path.join(dirPath, fileName);
   
   // ✅ Or use the polyfills
   import { path } from '../polyfills';
   const filePath = path.join(dirPath, fileName);
   ```

2. **Use environment detection helpers**:

   ```typescript
   import { isElectron, isRenderer } from '../polyfills';
   
   if (isElectron) {
     // Electron-specific code
     window.electron.readFile(filePath);
   } else {
     // Browser fallback
     fetch(filePath);
   }
   ```

3. **For file system operations**:

   ```typescript
   // Use the electron bridge API
   async function loadConfigFile(path) {
     try {
       const content = await window.electron.readFile(path);
       return JSON.parse(content);
     } catch (error) {
       console.error('Failed to load config:', error);
       return null;
     }
   }
   ```

### For Development Workflow

1. **Starting the development server**:

   ```bash
   npm run dev
   ```

   This script:
   - Compiles the preload script
   - Starts the Vite dev server for the renderer
   - Launches Electron with proper configuration

2. **Testing the path handling**:

   ```bash
   node test-vite-fix.js
   ```

   This verifies:
   - Preload script compilation
   - Path resolution in renderer
   - Environment detection

## Troubleshooting

### Common Issues and Solutions

1. **Path module errors still occur**:
   - Check that components are using `window.electron.path` or the polyfills
   - Verify the preload script is properly loaded
   - Look for direct imports of Node.js modules

2. **File paths don't resolve correctly**:
   - Ensure paths are relative to the correct base
   - For assets, use the AssetPathResolver utility
   - In production builds, check packaged file locations

3. **Module not found errors**:
   - Add missing modules to the `nodeBuiltinModules` list in vite.config.ts
   - Check that the module is properly polyfilled
   - Verify the module is available in the renderer context

## Implementation Details

### Polyfill Strategy

The solution uses a two-tier approach:

1. **First tier**: Use the Electron bridge API when available
   ```javascript
   if (typeof window !== 'undefined' && window.electron?.path?.join) {
     return window.electron.path.join(...paths);
   }
   ```

2. **Second tier**: Provide a simplified implementation for browser environments
   ```javascript
   return paths.filter(Boolean).join('/').replace(/\/\//g, '/');
   ```

### Vite Plugin Implementation

The custom Vite plugin works by:

1. Intercepting imports of Node.js modules
2. Providing virtual modules that adapt to the runtime environment
3. Dynamically generating code based on the module requested

### Error Handling

The solution includes robust error handling:

- Global error listener for path-related errors
- Try-catch blocks for all bridge API calls
- Fallback implementations for core functionality
- Development-time error messages with debugging hints

## Migration Guide

To migrate existing code:

1. Replace direct Node.js imports with polyfills:
   ```typescript
   // Before
   import path from 'path';
   
   // After
   import { path } from '../polyfills';
   ```

2. Update path operations:
   ```typescript
   // Before
   const filePath = path.join(__dirname, 'assets', fileName);
   
   // After
   const filePath = window.electron.path.join(appRoot, 'assets', fileName);
   // or
   const filePath = path.join(appRoot, 'assets', fileName);
   ```

3. Use environment checks where needed:
   ```typescript
   import { isElectron } from '../polyfills';
   
   const loadAsset = (assetPath) => {
     if (isElectron) {
       return window.electron.readFile(assetPath);
     } else {
       return fetch(assetPath).then(r => r.text());
     }
   };
   ```

## Further Improvements

Potential future enhancements:

1. Automated code migration tool to update imports
2. More comprehensive polyfills for additional Node.js modules
3. Integration with bundling optimization for production builds
4. Selective ESM/CommonJS module transformation based on context