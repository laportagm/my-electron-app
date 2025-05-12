# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands

- **Start the application in development mode**: `npm run dev`
- **Build the application**:
  - Build renderer only: `npm run build:renderer`
  - Build electron main process: `npm run build:electron`
  - Build complete app: `npm run build`
- **Run the production build**: `npm run start`

### Asset Setup

- **Setup brain models**: `./setup-brain-models.sh`
- **Setup Draco decoders**: `./setup-draco.sh`
- **Fix model loading issues**: `./fix-model-loading.sh`
- **Fix all known issues (Tailwind, models, decoders)**: `./fix-all.sh`

## Architecture Overview

This is an Electron-based application using React, Three.js, and TailwindCSS for visualizing 3D brain models. The application follows a typical Electron structure with main and renderer processes.

### Main Process

- Located in `src/main/main.ts`
- Responsible for creating the Electron window and IPC communication
- Handles logging via the `logger.ts` utility
- Uses environment-based configuration via `config.ts`

### Renderer Process

- Built with React, React Three Fiber, and TailwindCSS
- Uses Zustand for state management (`src/renderer/store/useAppStore.ts`)
- Main visualization is handled by `NeuroScene.tsx` component
- 3D models are loaded using `loadModel.ts` with Draco compression support
- Models are defined in `modelRegistry.ts`

### State Management

- Uses Zustand for state management with three main slices:
  - `ModelsSlice`: Handles 3D model selection, loading, and caching
  - `UiSlice`: Manages UI state like theme and panel visibility
  - `QuizSlice`: Handles quiz mode functionality

### 3D Model Loading Pipeline

1. Models are registered in `modelRegistry.ts`
2. Models are loaded via `loadModel.ts` which:
   - Checks the cache for previously loaded models
   - Sets up GLTF and Draco loaders
   - Attempts to load models with fallback strategies 
   - Returns fallback models if loading fails

### Layout Structure

- Main page is `Viewer.tsx` which contains:
  - `TopToolbar`: Navigation and controls
  - `NeuroScene`: 3D visualization area
  - `SidePanel`: Model selection and information
  - `StatusBar`: Status information and secondary controls

## Common Development Tasks

### Adding New 3D Models

1. Place GLB files in `public/assets/models/`
2. Register them in `src/renderer/utils/modelRegistry.ts` by adding to the `brainModels` array
3. Ensure Draco decoders are available in `public/draco/`

### Debugging Model Loading Issues

1. Enable debug mode in the UI
2. Check browser console for loading logs
3. Verify model paths are correct in `modelRegistry.ts`
4. Ensure models are properly placed in the `public/assets/models/` directory

### Theme Development

- TailwindCSS is configured for light/dark mode
- Theme is controlled via Zustand's `theme` state
- Custom colors and animations are defined in `tailwind.config.js`