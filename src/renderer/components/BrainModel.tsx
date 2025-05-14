import React, { useEffect, useRef, useState, useCallback, memo, Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import { loadModel } from '@/utils/loadModel';
import { getModelById } from '@/utils/modelRegistry';
import * as THREE from 'three';

// Lazy load the AnnotationLayer to break circular dependency
const AnnotationLayer = React.lazy(() => 
  import('./annotations/AnnotationLayer').then(module => ({ 
    default: module.default 
  }))
);

interface BrainModelProps {
  modelId?: string;
}

// Loading indicator cube - extracted as a separate component
const LoadingCube = memo(() => (
  <mesh scale={[0.5, 0.5, 0.5]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#ffaa00" />
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
      <lineBasicMaterial color="#ffffff" />
    </lineSegments>
  </mesh>
));

// Error indicator cube - extracted as a separate component
const ErrorCube = memo(() => (
  <mesh scale={[0.7, 0.7, 0.7]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#ff0000" />
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
      <lineBasicMaterial color="#ffffff" />
    </lineSegments>
  </mesh>
));

// Rotating animation component
const RotatingGroup = memo(({ loading, children }: { loading: boolean, children: React.ReactNode; }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Simple rotation animation for fallback cube
  useFrame((state, delta) => {
    if (groupRef.current && loading) {
      // Rotate fallback loading indicator
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return <group ref={groupRef}>{children}</group>;
});

// This component handles loading and displaying 3D brain models
function BrainModel({ modelId }: BrainModelProps) {
  // Use individual selectors to prevent unnecessary re-renders
  const selectedId = useAppStore(state => state.selectedId);
  const setCurrentModelRefAction = useAppStore(state => state.setCurrentModelRef);

  // Memoize action functions to prevent unnecessary re-renders
  const setCurrentModelRef = useCallback((ref: THREE.Group | null) => {
    setCurrentModelRefAction(ref);
  }, [setCurrentModelRefAction]);

  const modelRef = useRef<THREE.Group | null>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to track mounted state and previous model for safe updates and cleanup
  const isMounted = useRef(true);
  const prevModelRef = useRef<THREE.Group | null>(null);

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Determine which ID to use - prop takes precedence over store
  const id = modelId || selectedId;

  // Extract model loading logic into a memoized callback
  const loadBrainModel = useCallback(async (modelId: string) => {
    if (!modelId) return;

    try {
      setLoading(true);
      setError(null);

      // Get model metadata
      const modelInfo = getModelById(modelId);
      if (!modelInfo) {
        setError(`Model with ID "${modelId}" not found in registry`);
        setLoading(false);
        return;
      }

      console.log(`Loading brain model: ${modelInfo.name} (${modelId})`);

      // Load the model - try high poly version first
      const lowUrl = `assets/models/${modelId}.glb`;
      const highUrl = `assets/models/high-poly/${modelId}.glb`;

      const loadedModel = await loadModel({
        id: modelId,
        lowUrl,
        highUrl
      });

      // Set the loaded model
      setModel(loadedModel);

    } catch (err) {
      console.error(`Failed to load model ${modelId}:`, err);
      setError(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load model whenever ID changes
  useEffect(() => {
    if (!id) return;

    loadBrainModel(id);

    // Cleanup function to remove the model when component unmounts or ID changes
    return () => {
      setModel(null);

      // Use requestAnimationFrame to avoid cleanup during render
      requestAnimationFrame(() => {
        // Only run if component is unmounting or ID is changing
        if (!isMounted.current) {
          setCurrentModelRef(null);
        }
      });
    };
  }, [id, loadBrainModel, setCurrentModelRef]);

  // Update the modelRef whenever the model changes
  useEffect(() => {
    // Only update if model actually changed
    if (modelRef.current && model && model !== prevModelRef.current) {
      prevModelRef.current = model;

      // Clear any existing children first to prevent memory leaks
      if (modelRef.current) {
        while (modelRef.current.children.length > 0 && modelRef.current.children[0]) {
          modelRef.current.remove(modelRef.current.children[0]);
        }
      }

      // Add the new model as a child
      modelRef.current.add(model);

      // Use a flag to prevent multiple updates in the same cycle
      const hasUpdated = useRef(false);
      
      if (!hasUpdated.current) {
        hasUpdated.current = true;
        
        // Update the global reference - delay with setTimeout instead of requestAnimationFrame
        // to more effectively break render cycles
        const ref = modelRef.current;
        setTimeout(() => {
          // Check if component is still mounted before updating the store
          if (isMounted.current && ref) {
            setCurrentModelRef(ref);
            hasUpdated.current = false;
          }
        }, 0);
      }
    }

    // Cleanup function for model changes and unmounts
    return () => {
      // Only cleanup if component is unmounting
      if (!isMounted.current) {
        setTimeout(() => {
          setCurrentModelRef(null);
        }, 0);
      }
    };
  }, [model, setCurrentModelRef]);

  return (
    <group ref={modelRef} name={id || 'brain-model-container'}>
      {/* The model will be added to this group by the useEffect */}
      {loading && (
        <RotatingGroup loading={loading}>
          <LoadingCube />
        </RotatingGroup>
      )}

      {error && <ErrorCube />}

      {/* Add annotation layer when model is loaded and id is available - using React.lazy for better performance */}
      {!loading && !error && id && model && (
        <React.Suspense fallback={null}>
          {React.useMemo(() => <AnnotationLayer modelId={id} />, [id])}
        </React.Suspense>
      )}
    </group>
  );
}

export default memo(BrainModel);