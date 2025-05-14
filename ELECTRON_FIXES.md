# Electron Application Fixes

This document outlines the issues identified and fixed in the Electron application.

## Maximum Update Depth Exceeded Error

### Problem

In the React Three Fiber components, particularly in `NeuroScene.tsx` and `BrainModel.tsx`, the following error occurred:

```
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
```

This error occurred when loading 3D models and interacting with the scene, creating a sluggish experience or completely freezing the application.

### Cause Analysis

1. **Circular Component Dependencies**: Both `BrainModel.tsx` and `AnnotationLayer.tsx` were rendering each other directly and indirectly, creating circular rendering dependencies. In `NeuroScene.tsx`, we were rendering both the `BrainModel` and `AnnotationLayer` for the same model simultaneously.

2. **Synchronous Zustand Store Updates**: The Zustand store was using synchronous updates for 3D object references (models, camera, controls), which could trigger immediate re-renders and updates in connected components.

3. **Inefficient React Ref Management**: The refs in components like `CameraController` were not properly memoized, causing excessive updates during state changes.

4. **Multiple Store Subscriptions**: Components had multiple store subscriptions, with each triggering separate render cycles.

### Solution

The fix has been implemented across several files:

1. **Removed Circular Dependencies** in `NeuroScene.tsx`:
   ```typescript
   // BEFORE: Circular dependency with two components rendering for same model
   <>
     <BrainModel modelId={selectedId} />
     <AnnotationLayer modelId={selectedId} />
   </>
   
   // AFTER: Let BrainModel manage the AnnotationLayer internally
   <BrainModel modelId={selectedId} />
   ```

2. **Improved Store Updates** in `useAppStore.ts` with better state management:
   ```typescript
   // Added better equality checks for THREE.js objects
   const refEqual = ref === state.currentModelRef || 
                   (ref?.uuid && state.currentModelRef?.uuid && 
                    ref.uuid === state.currentModelRef.uuid);
   
   // Using requestIdleCallback (or fallback to setTimeout) with higher delays
   if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
     (window as any).requestIdleCallback(updateState, { timeout: 50 });
   } else {
     setTimeout(updateState, 50);
   }
   ```

3. **Enhanced Component State Management** in `AnnotationLayer.tsx`:
   ```typescript
   // Use local state with controlled updates instead of direct store access
   useEffect(() => {
     const unsubscribe = useAppStore.subscribe(
       (state) => [getAnnotationsForModel(state), state.isCreating],
       ([newAnnotations, newIsCreating]) => {
         if (!shallow(newAnnotations, stateValues.annotations) || 
             newIsCreating !== stateValues.isCreating) {
           setStateValues({
             annotations: newAnnotations,
             isCreating: newIsCreating
           });
         }
       }
     );
     return unsubscribe;
   }, [getAnnotationsForModel]);
   ```

4. **Optimized Ref Management** in `BrainModel.tsx`:
   ```typescript
   // Using a local flag to prevent multiple updates in the same cycle
   const hasUpdated = useRef(false);
   
   if (!hasUpdated.current) {
     hasUpdated.current = true;
     
     // Update the global reference with setTimeout instead of requestAnimationFrame
     setTimeout(() => {
       if (isMounted.current && ref) {
         setCurrentModelRef(ref);
         hasUpdated.current = false;
       }
     }, 0);
   }
   ```

5. **Lazily Loading Components** to break circular dependencies:
   ```typescript
   // Lazy load the AnnotationLayer to break circular dependency
   const AnnotationLayer = React.lazy(() => 
     import('./annotations/AnnotationLayer').then(module => ({ 
       default: module.default 
     }))
   );
   ```

### Testing

A comprehensive test suite has been created to verify the fix: 

1. `update-depth-fix.test.ts` includes tests to:
   - Verify BrainModel avoids maximum update depth
   - Ensure NeuroScene doesn't enter infinite update loops
   - Test model selection changes don't cause circular renders

2. The test validates that store updates remain under reasonable thresholds during component mounting, updating, and unmounting.

## PassiveOrbitControls DOM Element Issue

### Problem

In the React Three Fiber and OrbitControls integration within an Electron renderer process, the following error occurred:

```
TypeError: Cannot read properties of undefined (reading 'style')
```

This happened at line 60 in `PassiveOrbitControls.tsx` during the React mounting process. The issue is specific to Electron's renderer context, where React Three Fiber's DOM element lifecycle behaves differently than in a standard browser environment.

### Cause Analysis

1. When `controls.dispose()` is called in an Electron renderer context, it can nullify the `domElement` reference under certain conditions. 
2. This is different from browser behavior where the reference typically persists.
3. When `controls.connect()` is subsequently called, it tries to access `domElement.style`, causing the error.

### Solution

The fix has been implemented in `PassiveOrbitControls.tsx`:

1. We now save the original DOM element reference before any operations:
   ```typescript
   const originalDomElement = domElement;
   ```

2. After calling `dispose()`, we check if the `domElement` reference was lost and restore it if needed:
   ```typescript
   if (!controls.domElement && originalDomElement) {
     controls.domElement = originalDomElement;
   }
   ```

3. We only attempt to connect if we have a valid DOM element:
   ```typescript
   if (controls.domElement) {
     controls.connect();
   }
   ```

4. We've added error handling around the cleanup logic to prevent unmount errors:
   ```typescript
   try {
     // cleanup logic
   } catch (error) {
     console.warn('Error in cleanup:', error);
   }
   ```

### Enhanced Debugging Support

Additionally, we've created several utilities to help diagnose and fix similar Electron-specific issues:

1. **DOM Element Tracer**: A utility to track DOM element availability throughout component lifecycle.
2. **Canvas Initialization Tracker**: Ensures that Three.js canvas is fully initialized before OrbitControls attachment.
3. **Render Debugger**: Provides detailed timing information and a debug overlay to inspect rendering issues.

## Port Mismatch Issue

### Problem
The application was trying to connect to a Vite development server on port 5174, but the actual server was running on port 5173, causing a timeout error:

```
Error waiting for development server: Error: Timed out waiting for: http://localhost:5174/
```

### Root Cause
In `wait-and-launch.js`, the script was checking for development servers on both ports 5173 and 5174, but in the application configuration (vite.config.ts, package.json, start-dev.sh), the Vite server was consistently set to use port 5173.

### Solution
The `wait-and-launch.js` script was simplified to only check for port 5173, which matches the actual Vite server configuration. This eliminates the timeout error and improves startup time.

## "require is not defined" Error

### Problem
The application was encountering a runtime error:

```
Failed to load Node.js modules in main process: ReferenceError: require is not defined
```

### Root Cause
The error originated from the ESM/CommonJS module format mismatch. The package.json specifies `"type": "module"`, which makes all .js files use ES modules by default. However, the config.ts file was using CommonJS-style `require()` calls which are not available in ESM context.

### Solution
Created a new version of config.ts that:
1. Uses `import` instead of `require` for ESM compatibility
2. Defensively checks for the existence of `require` before using it in fallback paths
3. Properly handles both main process and renderer process environments
4. Uses consistently typed variables to avoid TypeScript errors

## "path.resolve is not a function" Error

### Problem
The application was encountering runtime errors with path operations:

```
Uncaught TypeError: path.resolve is not a function
```

### Root Cause
The path module was not being properly imported or accessed. In some contexts, the path module was imported correctly but in others it was missing or accessed incorrectly.

### Solution
1. Updated the preload script to properly expose Node.js path module functions to the renderer
2. Created an ESM-compatible version of the preload script
3. Added proper typings for path functions
4. Used explicit path module imports with consistent variable naming

## Cross-Environment Compatibility

### Problem
The application had issues working correctly in both main and renderer processes, and it had compatibility problems between development and production environments.

### Solution
1. Added robust environment detection:
   ```typescript
   const isMain = typeof process !== 'undefined' && 
     (typeof (process as any).type === 'undefined' || 
     (process as any).type === 'browser');

   const isRenderer = typeof process !== 'undefined' && 
     (process as any).type === 'renderer';
   ```

2. Used defensive coding patterns to handle potential missing APIs:
   ```typescript
   // Safely use window APIs only when in renderer
   if (typeof window !== 'undefined' && window.localStorage) {
     // ...
   }
   ```

3. Added fallbacks for all critical functionality

## Testing Infrastructure

Added comprehensive tests to verify the fixes and prevent regressions:

1. **Main Process Test**: Verifies the main process initialization and compatibility
2. **Path Resolution Test**: Ensures proper path handling across environments
3. **Preload Script Test**: Validates the preload script exposes the correct APIs
4. **Config Module Test**: Checks that configuration works in all contexts

## Implementation Steps

1. Replace `wait-and-launch.js` with the fixed version to resolve the port mismatch
2. Replace `src/utils/config.ts` with `src/utils/config.final.ts` to fix the require and path issues
3. Update the preload script or use the ESM version as needed
4. Fix circular dependencies in React components to prevent Maximum Update Depth errors:
   - Update `NeuroScene.tsx` to let BrainModel manage AnnotationLayer
   - Modify `BrainModel.tsx` to use lazy loading for AnnotationLayer
   - Enhance Zustand store's object reference management in `useAppStore.ts`
   - Improve state handling in `AnnotationLayer.tsx` 
   - Fix ref management in the CameraController component
5. Run the test suite to verify all fixes work properly

## Future Recommendations

1. **Module Format Consistency**: Decide on either ESM or CommonJS for the project and maintain consistency. If using ESM, avoid require() calls. If using CommonJS, set `"type": "commonjs"` in package.json.

2. **Preload Script Pattern**: Use the contextBridge pattern consistently as demonstrated in the fixed preload script:
   ```typescript
   contextBridge.exposeInMainWorld('electron', {
     // Safely exposed APIs...
   });
   ```

3. **Defensive Coding**: Continue using the defensive coding patterns demonstrated in the fixed files, especially:
   - Environment detection (main vs renderer)
   - Feature detection (window, localStorage, require)
   - Type safety (TypeScript interfaces for all exposed APIs)

4. **Port Configuration**: Maintain a single source of truth for port configuration. Use environment variables where possible to avoid hardcoded values.

5. **React Performance Optimization**:
   - Use `React.memo()` on all components that don't need frequent updates
   - Implement proper dependency arrays in all useEffect, useCallback, and useMemo hooks
   - Use stable references for callback functions to prevent unnecessary re-renders
   - Lazy load heavy components, especially when they might cause circular dependencies
   - Consider replacing direct store access with more controlled state management patterns

6. **Zustand Store Best Practices**:
   - Use atomic selectors that select the minimal state necessary
   - Prefer the subscribe pattern for components that need to track multiple state values
   - Implement proper equality checks for complex objects, especially THREE.js objects
   - Use debounced or throttled updates for high-frequency state changes
   - Consider splitting store into smaller slices to reduce unintended rerender cascades

7. **Testing**: Regularly run the test suite to catch regression issues early, with special focus on:
   - Component render cycles and update limits
   - Store subscription behavior
   - Reference management for 3D objects
   - Component interaction patterns