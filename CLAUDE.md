# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands

- **Start the application in development mode**: `npm run dev`
- **Build the application**:
  - Build renderer only: `npm run build:renderer`
  - Build electron main process: `npm run build:electron`
  - Build complete app: `npm run build`
  - Build prototype version (no native deps): `./build-prototype.sh`
- **Run the production build**: `npm run start`
- **Run tests**: 
  - All tests: `npm run test`
  - Specific test file: `npm run test -- src/test/config.test.ts`
  - With watch mode: `npm run test:watch`
  - With coverage: `npm run test:coverage`
- **Code quality**:
  - Type checking: `npm run typecheck`
  - Linting: `npm run lint`

### Troubleshooting Commands

- **Fix Rollup native module errors**: `npm run fix:rollup`
- **Fix Electron path.join errors**: `npm run fix:path`
- **Fix Vite configuration**: `npm run fix:vite`
- **Setup brain models**: `./setup-brain-models.sh`
- **Setup Draco decoders**: `./setup-draco.sh`
- **Fix model loading issues**: `./fix-model-loading.sh`
- **Fix all known issues**: `./fix-all.sh`

## Architecture Overview

This is an Electron-based application using React, React Three Fiber (R3F), and TailwindCSS for visualizing 3D brain models in an interactive environment with advanced visualization features.

### Module Structure

The application uses a hybrid module approach:
- Package.json specifies `"type": "module"` (ESM)
- However, Electron's main process works best with CommonJS
- The codebase handles this with dynamic imports and environment detection

```typescript
// Environment detection pattern used throughout the codebase
const isMain = typeof process !== 'undefined' && 
  (typeof (process as any).type === 'undefined' || 
  (process as any).type === 'browser');

const isRenderer = typeof process !== 'undefined' && 
  (process as any).type === 'renderer';
```

### Main Process

- Located in `src/main/main.ts`
- Responsible for creating the Electron window and IPC communication
- Uses contextBridge for safe exposure of Node.js APIs to renderer
- Handles logging via the `logger.ts` utility
- Uses environment-based configuration via `config.ts`

### Preload Script

The preload script (`src/main/preload.ts` and variants) is critical as it:
1. Safely exposes Node.js APIs to the renderer process
2. Sets up IPC communication channels
3. Provides access to filesystem and path utilities

When working with the preload script:
- Always use contextBridge pattern for exposing APIs
- Be careful with type definitions for exposed APIs
- Test changes with the preload script test suite

### Renderer Process

- Built with React, React Three Fiber, and TailwindCSS
- Uses Zustand for state management (`src/renderer/store/useAppStore.ts`)
- Main visualization is handled by `NeuroScene.tsx` component
- 3D models are loaded using `DracoDecoderManager.ts` and model registry
- Paths to assets are resolved by `AssetPathResolver.ts`

### State Management

- Uses Zustand with specialized slices for different concerns:
  - `ModelsSlice`: Handles 3D model selection, loading, and caching
  - `UiSlice`: Manages UI state like theme and panel visibility
  - `AnnotationSlice`: Manages annotations and their properties

### Key Systems

#### 1. Path Resolution System

The application needs to handle paths differently between:
- Development vs production environments
- Main vs renderer processes
- Packaged vs unpackaged modes

This is handled by:
- `pathUtils.ts` for consistent path resolution
- `AssetPathResolver.ts` for locating 3D models and assets
- Preload script exposing safe path operations

#### 2. 3D Model Loading Pipeline

1. Models are registered in `modelRegistry.ts`
2. Loading is managed by `standardAssetLoader.ts` which:
   - Determines correct model path 
   - Sets up Draco decoder for compressed models
   - Handles loading errors with fallbacks
   - Manages model caching

#### 3. Draco Decoder Management

3D models use Draco compression to reduce file size. The app:
1. Locates Draco decoder WASM files in multiple possible locations
2. Sets up decoder workers via `DracoDecoderManager.ts`
3. Configures Three.js loaders to use the correct decoder path

## Common Issues and Fixes

### 1. Electron Path Module Errors

If you encounter `path.join is not a function` errors:
- Ensure you're using the electron bridge in renderer code
- Replace direct Node.js imports with window.electron.* API
- Run `npm run fix:path` to apply the path resolution fix

### 2. Asset Loading Problems

If 3D models fail to load:
- Check that the Draco decoders are correctly set up
- Verify the asset paths in the model registry
- Look for path resolution issues in the console logs
- Run `./fix-model-loading.sh` to reset the asset loading system

### 3. Test Failures

The test suite uses Vitest with mocks for:
- Electron APIs
- Three.js and R3F components
- Browser APIs in Node.js environment

When fixing test failures:
- Check mock setup in `src/test/setup.ts`
- Look for environment detection issues
- Verify that code works in both main and renderer contexts

## Testing Guidelines

When writing or modifying tests:
1. Use the mocks in `src/test/mocks/` directory
2. Test both main and renderer process code paths
3. Mock Electron's contextBridge and IPC when testing preload scripts
4. Use dynamic imports for modules that depend on environment