import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
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
  const previewRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Line>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const { camera, scene, gl } = useThree();

  // Get annotation state from store - memoize the selector function to avoid infinite rerenders
  const annotationsSelector = useMemo(() => {
    return (state) => Object.values(state.annotations).filter(a => a.modelId === modelId);
  }, [modelId]);

  const annotations = useAppStore(annotationsSelector, shallow);

  // Get other state and actions from store
  const isCreating = useAppStore(state => state.isCreating);
  const selectAnnotation = useAppStore(state => state.selectAnnotation);
  const addAnnotation = useAppStore(state => state.addAnnotation);

  // Camera position for preview animation
  const cameraPosition = useRef(new THREE.Vector3());

  // Update camera position ref
  useEffect(() => {
    if (camera) {
      cameraPosition.current.copy(camera.position);
    }
  }, [camera]);

  // Preview animation
  useFrame(({ clock }) => {
    if (previewRef.current && hoverPoint) {
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
        positions[3] = hoverPoint.x;
        positions[4] = hoverPoint.y;
        positions[5] = hoverPoint.z;

        lineRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  // Handle annotation selection
  const handleSelect = useCallback((id: string) => {
    selectAnnotation(id);
  }, [selectAnnotation]);

  // Handle model click for creating new annotations
  const handleModelClick = useCallback((e: THREE.Event) => {
    if (!isCreating || !hoverPoint) return;

    // Stop event propagation
    e.stopPropagation();

    // Create a temporary title based on coordinates
    const title = `Annotation ${Math.floor(hoverPoint.x * 100) / 100}, ${Math.floor(hoverPoint.y * 100) / 100}, ${Math.floor(hoverPoint.z * 100) / 100}`;

    // Add the new annotation
    addAnnotation({
      modelId,
      position: toVector3Object(hoverPoint),
      title,
      content: '',
      visible: true
    });

    // Clear hover point
    setHoverPoint(null);
  }, [isCreating, addAnnotation, modelId, hoverPoint]);

  // Handle pointer move during creation mode with improved raycasting
  const handlePointerMove = useCallback((e: THREE.Event) => {
    if (!isCreating) {
      setHoverPoint(null);
      return;
    }

    // Convert mouse position to normalized device coordinates (-1 to +1)
    const x = (e.clientX / gl.domElement.clientWidth) * 2 - 1;
    const y = -(e.clientY / gl.domElement.clientHeight) * 2 + 1;
    mouse.current.set(x, y);

    // Update the raycaster with the mouse position and camera
    raycaster.current.setFromCamera(mouse.current, camera);

    // Filter scene objects to avoid UI elements and annotation layers
    const validObjects = scene.children.filter(obj =>
      obj.name !== 'annotation-layer' &&
      obj.visible &&
      !obj.userData.isUI
    );

    // Find intersections with the filtered objects
    const intersects = raycaster.current.intersectObjects(validObjects, true);

    // Update hover point if intersection found, using a stable reference
    if (intersects.length > 0) {
      // Clone the point to avoid reference issues
      const newPoint = intersects[0].point.clone();

      // Only update state if point has changed significantly to reduce renders
      if (!hoverPoint ||
          hoverPoint.distanceTo(newPoint) > 0.01) {  // Only update if moved more than 0.01 units
        setHoverPoint(newPoint);
      }
    } else if (hoverPoint !== null) {
      setHoverPoint(null);
    }
  }, [isCreating, camera, gl, scene, hoverPoint]);

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
      // Get toggleCreationMode function from store safely
      const toggleCreationMode = useAppStore.getState().toggleCreationMode;
      toggleCreationMode();
    }
  }, [isCreating]);

  // Add the escape key listener only once per component instance
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
      {isCreating && hoverPoint && (
        <group ref={previewRef} position={hoverPoint.toArray()}>
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
            <lineBasicMaterial
              color="#ff6b9d"
              transparent
              opacity={0.4}
              linewidth={1}
              dashSize={0.1}
              gapSize={0.05}
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

// Custom equality function that performs a more targeted comparison
// to prevent unnecessary re-renders that could cause infinite loops
const arePropsEqual = (prevProps: AnnotationLayerProps, nextProps: AnnotationLayerProps) => {
  return prevProps.modelId === nextProps.modelId;
};

// Use our custom equality function with React.memo to optimize re-renders
export default React.memo(AnnotationLayer, arePropsEqual);