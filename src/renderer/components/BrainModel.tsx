import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore, shallow } from '@/store/useAppStore';
import { loadModel } from '@/utils/loadModel';
import { getModelById } from '@/utils/modelRegistry';
import * as THREE from 'three';
import AnnotationLayer from './annotations/AnnotationLayer';

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
const RotatingGroup = memo(({ loading, children }: { loading: boolean, children: React.ReactNode }) => {
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
      setCurrentModelRef(null);
    };
  }, [id, loadBrainModel, setCurrentModelRef]);

  // Update the modelRef whenever the model changes
  useEffect(() => {
    if (modelRef.current && model) {
      // Clear any existing children first to prevent memory leaks
      if (modelRef.current) {
        while (modelRef.current.children.length > 0 && modelRef.current.children[0]) {
          modelRef.current.remove(modelRef.current.children[0]);
        }
      }

      // Add the new model as a child
      modelRef.current.add(model);

      // Update the global reference
      setCurrentModelRef(modelRef.current);
    }
  }, [model, setCurrentModelRef]);

  // Update the global reference after mount
  useEffect(() => {
    if (modelRef.current) {
      setCurrentModelRef(modelRef.current);
    }

    return () => {
      setCurrentModelRef(null);
    };
  }, [setCurrentModelRef]);

  return (
    <group ref={modelRef} name={id || 'brain-model-container'}>
      {/* The model will be added to this group by the useEffect */}
      {loading && (
        <RotatingGroup loading={loading}>
          <LoadingCube />
        </RotatingGroup>
      )}

      {error && <ErrorCube />}

      {/* Add annotation layer when model is loaded and id is available */}
      {!loading && !error && id && <AnnotationLayer modelId={id} />}
    </group>
  );
}

export default memo(BrainModel);