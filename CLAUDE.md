# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands

- **Start the application in development mode**: `npm run dev`
- **Alternative development start methods**:
  - JavaScript starter: `npm run dev:js`
  - Legacy starter: `npm run dev:legacy`
  - Concurrent mode: `npm run dev:concurrent`
- **Build the application**:
  - Build renderer only: `npm run build:renderer`
  - Build electron main process: `npm run build:electron`
  - Build complete app: `npm run build`
  - Build with main process bundling: `npm run build:bundle`
  - Build prototype version (no native deps): `./build-prototype.sh`
  - Platform-specific builds:
    - Mac: `npm run build:mac` or `npm run build:mac:bundle`
    - Windows: `npm run build:win` or `npm run build:win:bundle`
    - Linux: `npm run build:linux` or `npm run build:linux:bundle`
- **Run the production build**: `npm run start` or bundled: `npm run start:bundle`
- **Database initialization**: `npm run db:init`
- **Run tests**: 
  - All tests: `npm run test`
  - Specific test file: `npm run test -- src/test/config.test.ts`
  - With watch mode: `npm run test:watch`
  - With coverage: `npm run test:coverage`
  - With UI: `npm run test:ui`
- **Code quality**:
  - Type checking: `npm run typecheck`
  - Linting: `npm run lint`

### Troubleshooting Commands

- **Fix Rollup native module errors**: `npm run fix:rollup`
- **Fix Electron path.join errors**: `npm run fix:path`
- **Fix Vite configuration**: `npm run fix:vite`
- **Setup brain models**: `./setup-brain-models.sh`
- **Setup Draco decoders**: `./setup-draco.sh` or enhanced: `./setup-draco-enhanced.sh`
- **Fix model loading issues**: `./fix-model-loading.sh`
- **Fix asset loading**: `./fix-asset-loading.sh`
- **Fix all known issues**: `./fix-all.sh`

## Architecture Overview

This is an Electron-based application using React, React Three Fiber (R3F), and TailwindCSS for visualizing 3D brain models in an interactive environment with advanced visualization features and AI assistant capabilities.

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
- Manages database operations

### Database System

The application uses a flexible data storage approach:
- Based on `electron-store` that persists data in JSON format
- Structured for storing brain structures, user annotations, and interactions
- APIs in `src/lib/database.ts` provide access to all data operations
- Initialized with sample data using `npm run db:init`
- TypeScript interfaces in `src/types/database.ts` define data models

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
- AI assistant capabilities in `src/renderer/llm` directory

### State Management

- Uses Zustand with specialized slices for different concerns:
  - `ModelsSlice`: Handles 3D model selection, loading, and caching
  - `UiSlice`: Manages UI state like theme and panel visibility
  - `AnnotationSlice`: Manages annotations and their properties

#### Optimization Guidelines

When working with state:
- Use type-safe selectors to prevent unnecessary re-renders
- Create compound selectors for related state
- Group related actions to prevent scattered store access
- Use proper memoization with React.memo, useCallback, and useMemo

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

#### 4. AI Assistant Integration

The application includes local LLM capabilities:
1. Based on node-llama-cpp for local model execution
2. Models stored in `resources/llm-models` directory
3. Integration managed through `src/renderer/llm` components
4. Specialized state slice for LLM interactions

## Common Issues and Fixes

### 1. Electron Path Module Errors

If you encounter `path.join is not a function` errors:
- Ensure you're using the electron bridge in renderer code
- Replace direct Node.js imports with window.electron.* API
- Run `npm run fix:path` to apply the path resolution fix

```javascript
// ❌ DON'T do this in renderer:
import path from 'path';
path.join(__dirname, 'file.txt');

// ✅ DO this instead:
window.electron.path.join(__dirname, 'file.txt');
```

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

### 4. Module Format Conflicts

If you encounter "require is not defined" errors:
- Check if you're mixing ESM and CommonJS module formats
- Use dynamic imports with environment detection
- Consider using the enhanced config module that handles both formats

## Testing Guidelines

The application uses Vitest for testing with specialized support for:

- **Component Testing**: Testing React components with React Testing Library
- **Three.js/R3F Testing**: Using comprehensive mocks to test 3D rendering components
- **Electron API Testing**: Mocking Electron's main and renderer APIs
- **Path Resolution Testing**: Testing path handling across environments

When writing or modifying tests:
1. Use the mocks in `src/test/mocks/` directory:
   - `three-updated.ts`: Mock for Three.js components
   - `r3f.ts`: Mock for React Three Fiber
   - `config.ts`: Mock for the config module
2. Test both main and renderer process code paths
3. Mock Electron's contextBridge and IPC when testing preload scripts
4. Use dynamic imports for modules that depend on environment
5. Check `src/test/setup.ts` for reference on how to mock complex dependencies

## Performance Optimization

When working on performance improvements:

1. **Component Structure**:
   - Split large components into smaller, focused ones
   - Use proper memoization with React.memo, useCallback, and useMemo
   - Extract logic into custom hooks for reusability

2. **State Management**:
   - Use type-safe selectors to prevent unnecessary re-renders
   - Implement selector hooks with proper dependency tracking
   - Group related state and actions

3. **Resource Management**:
   - Ensure proper Three.js resource disposal
   - Implement efficient model caching
   - Consider LOD (Level of Detail) for complex models

4. **Error Handling**:
   - Use specialized error boundaries for different features
   - Implement proper fallback components
   - Add detailed error reporting for debugging

## Adding Custom Models

1. Place GLB files in `public/assets/models/`
2. Add model metadata to `src/renderer/utils/modelRegistry.ts`
3. Restart the application

## TypeScript Path Aliases

The application uses path aliases for cleaner imports:

```typescript
// Instead of relative paths like:
import { config } from '../../../utils/config';

// Use path aliases:
import { config } from '@main/utils/config';
```

Available aliases:
- `@/*`: Maps to `src/renderer/*`
- `@renderer/*`: Maps to `src/renderer/*`
- `@main/*`: Maps to `src/main/*`
- `@shared/*`: Maps to `src/shared/*`
- `@llm/*`: Maps to `src/renderer/llm/*`
- `@database/*`: Maps to `src/main/database/*`