import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, shallow } from '@/store/useAppStore';
import AnnotationMarker from './AnnotationMarker';
import { toVector3Object } from './types';

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

  // FIXED ANNOTATION STATE MANAGEMENT - PREVENT CYCLICAL UPDATES
  // Using static selectors to completely eliminate selector recreation
  const getAnnotationsForModel = useCallback((state) => {
    return Object.keys(state.annotations)
      .filter(id => state.annotations[id]?.modelId === modelId)
      .map(id => state.annotations[id]);
  }, [modelId]);
  
  const getIsCreating = (state) => state.isCreating;
  
  // We'll keep function references in refs to prevent recreation
  const actionRefs = useRef({
    selectAnnotation: null,
    addAnnotation: null,
    toggleCreationMode: null
  });
  
  // Store the state values and update them only when they change
  const [stateValues, setStateValues] = useState({
    annotations: [],
    isCreating: false
  });
  
  // Use effect to update state only when needed, breaking render cycles
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
    
    // One-time action function references
    actionRefs.current = {
      selectAnnotation: useAppStore.getState().selectAnnotation,
      addAnnotation: useAppStore.getState().addAnnotation,
      toggleCreationMode: useAppStore.getState().toggleCreationMode
    };
    
    // Initial load
    setStateValues({
      annotations: getAnnotationsForModel(useAppStore.getState()),
      isCreating: useAppStore.getState().isCreating
    });
    
    return unsubscribe;
  }, [getAnnotationsForModel]);
  
  // Use local variables from the useState, not direct store access
  const { annotations, isCreating } = stateValues;
  
  // Create stable references to the functions that won't change
  const selectAnnotation = useCallback((id) => {
    actionRefs.current.selectAnnotation(id);
  }, []);
  
  const addAnnotation = useCallback((annotation) => {
    actionRefs.current.addAnnotation(annotation);
  }, []);
  
  const toggleCreationMode = useCallback(() => {
    actionRefs.current.toggleCreationMode();
  }, []);

  // Camera position for preview animation
  const cameraPosition = useRef(new THREE.Vector3());

  // Update camera position ref - use a stable reference with a debounced update
  useEffect(() => {
    if (!camera) return;

    const updateCameraPosition = () => {
      if (camera) {
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

  // Use a ref to track the last hover point for creating annotations
  const lastHoverPointRef = useRef<THREE.Vector3 | null>(null);

  // Handle model click for creating new annotations
  const handleModelClick = useCallback((e: React.MouseEvent<THREE.Mesh> & {
    stopPropagation: () => void;
  }) => {
    if (!isCreating || !lastHoverPointRef.current) return;

    e.stopPropagation();

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

  // Stable reference for scene objects
  const cachedSceneObjects = useRef<THREE.Object3D[]>([]);

  // Cache scene objects on mount and when scene changes
  useEffect(() => {
    if (!scene) return;

    cachedSceneObjects.current = Array.from(scene.children);

    const handleSceneChange = () => {
      cachedSceneObjects.current = Array.from(scene.children);
    };

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
    if (!scene || !scene.children.length) return;

    const updateValidObjects = () => {
      validObjectsRef.current = cachedSceneObjects.current.filter(obj =>
        obj.name !== 'annotation-layer' &&
        obj.visible &&
        !obj.userData.isUI
      );
    };
    
    // Initial update
    updateValidObjects();

    // Update on scene changes
    scene.addEventListener('childadded', updateValidObjects);
    scene.addEventListener('childremoved', updateValidObjects);

    return () => {
      scene.removeEventListener('childadded', updateValidObjects);
      scene.removeEventListener('childremoved', updateValidObjects);
    };
  }, [scene]);

  // Function to perform raycasting in a requestAnimationFrame
  const performRaycasting = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (!isCreating) return;

    rafIdRef.current = requestAnimationFrame(() => {
      raycaster.current.setFromCamera(mouse.current, camera);
      const intersects = raycaster.current.intersectObjects(validObjectsRef.current, true);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;

        const distanceThreshold = 0.0001 * (1 + mouseVelocityRef.current * 10);
        const significantChange = !lastHoverPointRef.current ||
                                point.distanceToSquared(lastHoverPointRef.current) > distanceThreshold;

        if (significantChange) {
          const newPoint = point.clone();
          lastHoverPointRef.current = newPoint;

          // Use setState callback to avoid closure issues
          setHoverPoint(() => newPoint);
        }
      } else if (hoverPoint !== null) {
        lastHoverPointRef.current = null;
        setHoverPoint(null);
      }

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
    if (!isCreating) {
      if (hoverPoint !== null) {
        setHoverPoint(null);
      }
      return;
    }

    const mouseX = (e.clientX / gl.domElement.clientWidth) * 2 - 1;
    const mouseY = -(e.clientY / gl.domElement.clientHeight) * 2 + 1;

    const dx = mouseX - prevMousePosRef.current.x;
    const dy = mouseY - prevMousePosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    mouseVelocityRef.current = distance;

    prevMousePosRef.current = { x: mouseX, y: mouseY };

    const throttleTime = mouseVelocityRef.current > 0.05 ? 100 : 30;
    const now = Date.now();
    if (now - lastUpdateRef.current < throttleTime) {
      return;
    }
    lastUpdateRef.current = now;

    mouse.current.set(mouseX, mouseY);
    performRaycasting();
  }, [isCreating, gl, performRaycasting, hoverPoint]);

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

  // Create a stable handler for escape key to exit creation mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isCreating) {
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

// Memoize the component to prevent unnecessary renders
export default React.memo(AnnotationLayer, (prevProps, nextProps) => {
  return prevProps.modelId === nextProps.modelId;
});