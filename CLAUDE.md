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
- **Analyze bundle size**: `npm run analyze`
- **Type checking**: `npm run typecheck`
- **Run tests**: `npm run test`

### Asset Setup

- **Setup brain models**: `./setup-brain-models.sh`
- **Setup Draco decoders**: `./setup-draco.sh`
- **Fix model loading issues**: `./fix-model-loading.sh`
- **Fix all known issues (Tailwind, models, decoders)**: `./fix-all.sh`

## Architecture Overview

This is an Electron-based application using React, React Three Fiber, and TailwindCSS for visualizing 3D brain models in an interactive 3D environment with advanced visualization features.

### Main Process

- Located in `src/main/main.ts`
- Responsible for creating the Electron window and IPC communication
- Handles logging via the `logger.ts` utility
- Uses environment-based configuration via `config.ts`

### Renderer Process

- Built with React, React Three Fiber, and TailwindCSS
- Uses Zustand for state management (`src/renderer/store/useAppStore.ts`)
- Main visualization is handled by `NeuroScene.tsx` component
- 3D models are loaded using the enhanced LOD system in `ModelOptimizer.ts`
- Models are defined in `modelRegistry.ts`

### State Management

- Uses Zustand for state management with specialized slices:
  - `ModelsSlice`: Handles 3D model selection, loading, and caching
  - `UiSlice`: Manages UI state like theme and panel visibility
  - `ViewportSlice`: Manages multiple viewport configurations
  - `SelectionSlice`: Handles structure selection and highlighting
  - `AnnotationSlice`: Manages annotations and their properties
  - `ClippingSlice`: Controls cross-sectional viewing
  - `MeasurementSlice`: Manages distance measurement tools

### 3D Model Loading Pipeline

1. Models are registered in `modelRegistry.ts`
2. Model loading is handled by `ModelOptimizer.ts` which:
   - Loads appropriate LOD (Level of Detail) based on camera distance
   - Manages pre-generated LOD models for each brain structure
   - Properly handles model caching and memory management
   - Implements efficient material handling with proper resource disposal

### Visualization Features

- **Multi-viewport System**: Multiple synchronized views (axial, sagittal, coronal, 3D)
- **Cross-sectional Viewing**: Cut through models along any axis with highlighted cut edges
- **Structure Selection**: Interactive selection of specific brain parts with highlighting
- **Measurement Tools**: Distance measurement between points in 3D space
- **Annotation System**: Create, edit, and manage annotations with smart label placement
- **Performance Optimization**: LOD system, instanced rendering, and efficient resource management

### Component Structure

- Organized by feature domain:
  - `/components/camera`: Camera controls and management
  - `/components/models`: Model loading and rendering
  - `/components/viewport`: Multi-viewport system
  - `/components/clipping`: Cross-sectional viewing
  - `/components/selection`: Structure selection and highlighting
  - `/components/annotations`: Annotation system
  - `/components/measurement`: Distance measurement tools
  - `/components/errors`: Error handling components
  - `/components/loading`: Loading indicators and progress tracking

## Common Development Tasks

### Adding New 3D Models

1. Prepare models in multiple resolutions (high, medium, low)
2. Place GLB files in appropriate directories:
   - High resolution: `public/assets/models/high/`
   - Medium resolution: `public/assets/models/medium/`
   - Low resolution: `public/assets/models/low/`
3. Register them in `src/renderer/utils/modelRegistry.ts` by adding to the `brainModels` array
4. Add structure mapping information if supporting part selection

### Working with Brain Structure Parts

1. Define structure metadata in `brainPartRegistry.ts`
2. Map mesh names to structure IDs and metadata
3. Add appropriate highlighting colors and descriptions

### Creating New Viewports

1. Use `ViewportLayout` component for multi-view rendering
2. Configure viewport types (perspective, orthographic)
3. Set up appropriate camera positions and targets
4. Link viewports as needed for synchronized navigation

### Adding Annotations

1. Use the `AnnotationSystem` for creating and managing annotations
2. Configure smart label placement to prevent overlaps
3. Use the annotation persistence system for saving user annotations

### Theme Development

- TailwindCSS is configured for light/dark mode
- Theme is controlled via Zustand's `theme` state
- Custom colors and animations are defined in `tailwind.config.js`

## Performance Considerations

- Use the LOD system for large models (see `ModelOptimizer.ts`)
- Enable instancing for repeated geometries
- Properly dispose of Three.js resources when no longer needed
- Use the performance monitoring tools in development mode
- Consider frustum culling and occlusion culling for complex scenes
