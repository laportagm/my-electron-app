# TypeScript Bundling with esbuild

This document explains how we use esbuild for TypeScript compilation and bundling in the Electron application.

## Overview

Instead of using TypeScript's `tsc` compiler with `--outFile` (which only works with AMD or System modules), we use esbuild to:

1. Bundle the main process TypeScript files into a single JavaScript file
2. Maintain CommonJS module compatibility
3. Improve build performance significantly
4. Reduce file size with minification (in production)

## Bundling Scripts

The bundler is implemented in two key files:

### `bundle-main.js`

This script uses esbuild to bundle TypeScript files:

- Automatically detects development/production mode
- Sets the correct entry point and output location
- Configures esbuild with appropriate options
- Handles external dependencies properly

### `start-bundled.js`

This script starts Electron with the bundled file:

- Works with both development and production modes
- Checks if the bundled file exists
- Starts Electron with the correct environment variables

## NPM Scripts

We've added several npm scripts for bundling:

```json
"build:electron:bundle": "NODE_ENV=production node bundle-main.js",
"build:bundle": "npm run prebuild && npm run build:renderer && npm run build:electron:bundle && npm run build:preload && electron-builder",
"start:bundle": "NODE_ENV=production node start-bundled.js",
"dev:bundle": "NODE_ENV=development concurrently \"npm run dev:renderer\" \"node bundle-main.js && node start-bundled.js\"",
```

## Usage

### Development with Bundling

```bash
npm run dev:bundle
```

This will:
1. Start the Vite dev server for the renderer
2. Bundle the main process with esbuild
3. Start Electron with the bundled file

### Production Build with Bundling

```bash
npm run build:bundle
```

This will:
1. Prepare the build
2. Build the renderer with Vite
3. Bundle the main process with esbuild
4. Compile the preload script
5. Package the app with electron-builder

### Testing the Bundling Process

```bash
./test-bundle.sh
```

This script will test the bundling process in development mode and clean up after itself.

## Advantages Over TypeScript's --outFile

1. **Better Module Compatibility**: Works with CommonJS modules
2. **Performance**: esbuild is significantly faster than tsc
3. **Tree Shaking**: Removes unused code
4. **Minification**: Reduces file size
5. **Source Maps**: Better debugging in development

## Troubleshooting

If you encounter issues with bundling:

1. Check if esbuild is installed: `npm list esbuild`
2. Ensure the entry point file exists and exports are correct
3. Look for any missing external dependencies in the bundle config
4. Try running in development mode first to debug any issues