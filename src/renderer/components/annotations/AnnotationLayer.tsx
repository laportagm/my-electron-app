import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, shallow } from '@/store/useAppStore';
import AnnotationMarker from './AnnotationMarker';
import { toVector3Object } from './types';

// We don't need to extend Three.js components anymore
// because we're using lowercase component names which
// are automatically provided by R3F

interface AnnotationLayerProps {
  modelId: string;
}

/**
 * AnnotationLayer manages all annotations for a 3D model
 * and handles creation of new annotations with improved visual feedback
 */
const AnnotationLayer: React.FC<AnnotationLayerProps> = ({ modelId }) => {
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const previewRef = useRef<THREE.Group | null>(null);
  const lineRef = useRef<THREE.Line | null>(null);
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouse = useRef<THREE.Vector2>(new THREE.Vector2());
  const { camera, scene, gl } = useThree();

  // ENHANCED REWRITE OF ANNOTATION STATE MANAGEMENT
  // Using a multi-step approach with primitive selectors to eliminate React 18 useSyncExternalStore issues

  // Step 1: Create a stable, cacheable selector function
  const annotationIdsSelector = useCallback((state) => {
    // Only return primitives (IDs) from the selector to avoid reference equality issues
    return Object.keys(state.annotations).filter(id =>
      state.annotations[id]?.modelId === modelId
    );
  }, [modelId]);

  // Step 2: Use the selector with shallow comparison to get stable primitive values
  // This properly caches the getSnapshot result for useSyncExternalStore
  const annotationIds = useAppStore(annotationIdsSelector, shallow);

  // Step 3: Keep a stable reference to the annotationIds array for memoization
  const stableAnnotationIds = useRef(annotationIds);

  // Step 4: Update the reference only when the actual content changes (not just the reference)
  useEffect(() => {
    // Only update the ref if the IDs have actually changed
    if (!shallowEqual(stableAnnotationIds.current, annotationIds)) {
      stableAnnotationIds.current = annotationIds;
    }
  }, [annotationIds]);

  // Step 5: Create the derived annotations with a proper React dependency
  // Using a direct selector instead of getState() to avoid React 18 sync issues
  const annotationsSelector = useCallback((state) => {
    // Only process if we have valid IDs
    if (!stableAnnotationIds.current?.length) return [];
    // Map IDs to actual objects directly from the state
    return stableAnnotationIds.current.map(id => state.annotations[id]);
  }, []); // No dependencies as it uses ref internally

  // Use the selector with shallow comparison
  const annotations = useAppStore(annotationsSelector, shallow);

  // Helper function for shallow equality check
  function shallowEqual(arrA: any[], arrB: any[]): boolean {
    if (arrA === arrB) return true;
    if (arrA.length !== arrB.length) return false;

    for (let i = 0; i < arrA.length; i++) {
      if (arrA[i] !== arrB[i]) return false;
    }

    return true;
  }

  // Get other state and actions from store with proper memoization
  // Use primitive selectors for state to avoid reference equality issues
  const isCreatingSelector = useCallback((state) => state.isCreating, []);
  const isCreating = useAppStore(isCreatingSelector);

  // For actions, we can use direct selection since they're stable functions
  const selectAnnotationSelector = useCallback((state) => state.selectAnnotation, []);
  const selectAnnotation = useAppStore(selectAnnotationSelector);

  const addAnnotationSelector = useCallback((state) => state.addAnnotation, []);
  const addAnnotation = useAppStore(addAnnotationSelector);

  // Camera position for preview animation
  const cameraPosition = useRef(new THREE.Vector3());

  // Update camera position ref - use a stable reference with a debounced update
  useEffect(() => {
    // Skip if camera is not available
    if (!camera) return;

    // Create a stable update function that won't cause rerenders
    const updateCameraPosition = () => {
      if (camera && cameraPosition.current) {
        cameraPosition.current.copy(camera.position);
      }
    };

    // Initial update
    updateCameraPosition();

    // Use requestAnimationFrame for smooth updates that don't trigger rerenders
    const frame = requestAnimationFrame(updateCameraPosition);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [camera]);

  // Store last valid hover point for animation in a ref
  const animationPointRef = useRef<THREE.Vector3 | null>(null);

  // Preview animation - completely removed dependencies on state
  useFrame(({ clock }) => {
    // Use the hover point state once to update our ref, but don't depend on it for rendering
    if (hoverPoint && (!animationPointRef.current || !animationPointRef.current.equals(hoverPoint))) {
      animationPointRef.current = hoverPoint.clone();
    }

    if (previewRef.current && animationPointRef.current) {
      // Subtly animate the preview marker
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
      previewRef.current.scale.set(scale, scale, scale);

      // Update the line connecting camera to preview point
      if (lineRef.current && lineRef.current.geometry.attributes.position) {
        const positions = lineRef.current.geometry.attributes.position.array as Float32Array;

        // Start from camera position (a bit in front to avoid clipping)
        const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const startPoint = cameraPosition.current.clone().add(cameraDir.multiplyScalar(0.5));

        positions[0] = startPoint.x;
        positions[1] = startPoint.y;
        positions[2] = startPoint.z;

        // End at hover point
        const point = animationPointRef.current;
        positions[3] = point.x;
        positions[4] = point.y;
        positions[5] = point.z;

        lineRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  // Handle annotation selection
  const handleSelect = useCallback((id: string) => {
    selectAnnotation(id);
  }, [selectAnnotation]);

  // Handle model click for creating new annotations
  const handleModelClick = useCallback((e: React.MouseEvent<THREE.Mesh> & {
    stopPropagation: () => void;
  }) => {
    // Use lastHoverPointRef to avoid dependency on hoverPoint state
    // which can cause unnecessary re-renders
    if (!isCreating || !lastHoverPointRef.current) return;

    // Stop event propagation
    e.stopPropagation();

    // Create a temporary title based on coordinates
    const point = lastHoverPointRef.current;
    const title = `Annotation ${Math.floor(point.x * 100) / 100}, ${Math.floor(point.y * 100) / 100}, ${Math.floor(point.z * 100) / 100}`;

    // Add the new annotation
    addAnnotation({
      modelId,
      position: toVector3Object(point),
      title,
      content: '',
      visible: true
    });

    // Clear hover point
    lastHoverPointRef.current = null;
    setHoverPoint(null);
  }, [isCreating, addAnnotation, modelId]);

  // Use a ref to track the last update time for debouncing
  const lastUpdateRef = useRef(0);
  // Use a ref to track the last hover point for comparison without triggering re-renders
  const lastHoverPointRef = useRef<THREE.Vector3 | null>(null);

  // Stable reference for scene objects
  const cachedSceneObjects = useRef<THREE.Object3D[]>([]);

  // Cache scene objects on mount and when scene changes
  useEffect(() => {
    if (!scene) return;

    // This happens once on mount or when scene changes
    // We're not filtering yet to avoid recreating arrays during render
    cachedSceneObjects.current = Array.from(scene.children);

    // Update cached objects when scene children change
    const handleSceneChange = () => {
      cachedSceneObjects.current = Array.from(scene.children);
    };

    // Listen for changes to the scene
    scene.addEventListener('childadded', handleSceneChange);
    scene.addEventListener('childremoved', handleSceneChange);

    return () => {
      scene.removeEventListener('childadded', handleSceneChange);
      scene.removeEventListener('childremoved', handleSceneChange);
    };
  }, [scene]);

  // Track mouse position for velocity calculations
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const mouseVelocityRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Store filtered objects to avoid recreating array on every move
  const validObjectsRef = useRef<THREE.Object3D[]>([]);

  // Update the filtered objects when scene changes
  useEffect(() => {
    // Only update when scene changes and has children
    if (!scene || !scene.children.length) return;

    validObjectsRef.current = cachedSceneObjects.current.filter(obj =>
      obj.name !== 'annotation-layer' &&
      obj.visible &&
      !obj.userData.isUI
    );

    // Set up a mutation observer to watch for changes to the scene
    const updateValidObjects = () => {
      validObjectsRef.current = cachedSceneObjects.current.filter(obj =>
        obj.name !== 'annotation-layer' &&
        obj.visible &&
        !obj.userData.isUI
      );
    };

    // Update on scene changes
    scene.addEventListener('childadded', updateValidObjects);
    scene.addEventListener('childremoved', updateValidObjects);

    return () => {
      scene.removeEventListener('childadded', updateValidObjects);
      scene.removeEventListener('childremoved', updateValidObjects);
    };
  }, [scene, cachedSceneObjects.current]);

  // Function to perform raycasting in a requestAnimationFrame
  const performRaycasting = useCallback(() => {
    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Skip if we're not in creation mode
    if (!isCreating) return;

    // Schedule the raycasting in the next animation frame
    rafIdRef.current = requestAnimationFrame(() => {
      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);

      // Find intersections with the pre-filtered objects
      const intersects = raycaster.current.intersectObjects(validObjectsRef.current, true);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;

        // Determine threshold based on mouse velocity
        // Use smaller threshold for slow movements, larger for fast movements
        const distanceThreshold = 0.0001 * (1 + mouseVelocityRef.current * 10);
        const significantChange = !lastHoverPointRef.current ||
                                 point.distanceToSquared(lastHoverPointRef.current) > distanceThreshold;

        if (significantChange) {
          // Clone only when we actually need a new point
          const newPoint = point.clone();
          lastHoverPointRef.current = newPoint;

          // Use the useState updater pattern for maximum safety
          setHoverPoint(() => newPoint);
        }
      } else if (hoverPoint !== null) {
        // Only update state if there's a change
        lastHoverPointRef.current = null;
        setHoverPoint(null);
      }

      // Reset reference to indicate completion
      rafIdRef.current = null;
    });
  }, [isCreating, camera, hoverPoint]);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Enhanced pointer move handler with dynamic throttling based on movement speed
  const handlePointerMove = useCallback((e: React.MouseEvent<THREE.Mesh> & {
    clientX: number;
    clientY: number;
  }) => {
    // Early exit if creation mode is disabled
    if (!isCreating) {
      if (hoverPoint !== null) {
        setHoverPoint(null);
      }
      return;
    }

    // Calculate mouse position
    const mouseX = (e.clientX / gl.domElement.clientWidth) * 2 - 1;
    const mouseY = -(e.clientY / gl.domElement.clientHeight) * 2 + 1;

    // Calculate velocity (how fast the mouse is moving)
    const dx = mouseX - prevMousePosRef.current.x;
    const dy = mouseY - prevMousePosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    mouseVelocityRef.current = distance;

    // Update previous position
    prevMousePosRef.current = { x: mouseX, y: mouseY };

    // Dynamic throttling based on movement speed
    // Use shorter intervals for slow, precise movements
    // Use longer intervals for fast movements
    const throttleTime = mouseVelocityRef.current > 0.05 ? 100 : 30;

    // Throttle updates based on dynamic time
    const now = Date.now();
    if (now - lastUpdateRef.current < throttleTime) {
      return;
    }
    lastUpdateRef.current = now;

    // Use the existing Vector2 object without creating a new one
    mouse.current.set(mouseX, mouseY);

    // Perform the actual raycasting in a requestAnimationFrame
    // This moves the heavy computation off the event handler
    performRaycasting();

  }, [isCreating, gl, performRaycasting, hoverPoint]); // Properly declared dependencies

  // Set cursor based on creation mode
  useEffect(() => {
    if (isCreating) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'auto';
    }

    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [isCreating]);

  // Get toggleCreationMode action from store with proper memoization
  const toggleCreationModeSelector = useCallback((state) => state.toggleCreationMode, []);
  const toggleCreationMode = useAppStore(toggleCreationModeSelector);

  // Create a stable handler for escape key to exit creation mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isCreating) {
      // Use the properly subscribed action instead of getState()
      toggleCreationMode();
    }
  }, [isCreating, toggleCreationMode]);

  // Add the escape key listener only once per component instance
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Pre-calculate values for rendering to avoid accessing state during render
  const showPreview = isCreating && hoverPoint !== null;
  const previewPosition: [number, number, number] = hoverPoint ? [hoverPoint.x, hoverPoint.y, hoverPoint.z] : [0, 0, 0];

  return (
    <group name="annotation-layer">
      {/* Existing annotations */}
      {annotations.map(annotation => (
        <AnnotationMarker
          key={annotation.id}
          annotation={annotation}
          onSelect={handleSelect}
        />
      ))}

      {/* Enhanced preview marker when in creation mode */}
      {showPreview && (
        <group ref={previewRef} position={previewPosition}>
          {/* Main preview sphere */}
          <mesh>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshStandardMaterial
              color="#ff6b9d"
              transparent
              opacity={0.6}
              roughness={0.3}
              metalness={0.5}
              emissive="#ff6b9d"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial
              color="#ff6b9d"
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Guide line from camera to point */}
          <line ref={lineRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array(6)}
                itemSize={3}
              />
            </bufferGeometry>
            <lineDashedMaterial
              color="#ff6b9d"
              transparent
              opacity={0.4}
              linewidth={1}
              dashSize={0.1}
              gapSize={0.05}
              scale={1}
            />
          </line>

          {/* Point light for glow effect */}
          <pointLight position={[0, 0, 0]} color="#ff6b9d" distance={0.5} intensity={1} />
        </group>
      )}

      {/* Click handler for the entire scene during creation mode */}
      {isCreating && (
        <mesh
          visible={false}
          position={[0, 0, 0]}
          onPointerMove={handlePointerMove}
          onClick={handleModelClick}
          userData={{ isUI: true }}
        >
          <sphereGeometry args={[100, 64, 64]} />
          <meshBasicMaterial side={THREE.BackSide} transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
};

// Enhanced memo pattern with more robust prop comparison
// This uses an explicit equality function that's optimized for this specific component
const arePropsEqual = (prevProps: AnnotationLayerProps, nextProps: AnnotationLayerProps) => {
  // Only re-render if the modelId has changed
  return prevProps.modelId === nextProps.modelId;
};

// Create the memo component with a displayName for better debugging
const MemoizedAnnotationLayer = React.memo(AnnotationLayer, arePropsEqual);
MemoizedAnnotationLayer.displayName = 'MemoizedAnnotationLayer';

// Export constants and helpers for testing/debugging
export const __INTERNAL__ = {
  AnnotationLayer,
  arePropsEqual
};

// Export the memoized component as the default
export default MemoizedAnnotationLayer;