import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import { loadModel } from '@/utils/loadModel';
import { getModelById } from '@/utils/modelRegistry';
import * as THREE from 'three';

interface BrainModelProps {
  modelId?: string;
  wireframe?: boolean; 
  autoRotate?: boolean;
  opacity?: number;
  color?: string;
  onLoad?: (model: THREE.Group) => void;
  onError?: (error: Error) => void;
}

/**
 * Component for loading and displaying 3D brain models
 * Uses optimized rendering and state management
 */
const BrainModel: React.FC<BrainModelProps> = React.memo(({
  modelId,
  wireframe = false,
  autoRotate = false,
  opacity = 1,
  color,
  onLoad,
  onError
}) => {
  // State selectors
  const selectedId = useAppStore(state => state.selectedId);
  const setLoading = useAppStore(state => state.setLoading);
  const addToCache = useAppStore(state => state.addToCache);
  const cache = useAppStore(state => state.cache);
  const setCurrentModelRef = useAppStore(state => state.setCurrentModelRef);
  
  // Local state
  const modelRef = useRef<THREE.Group | null>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);
  
  // Determine which ID to use - prop takes precedence over store
  const id = modelId || selectedId;
  
  // Load model from cache or network
  const loadBrainModel = useCallback(async () => {
    if (!id) return;
    
    try {
      setLocalLoading(true);
      setLocalError(null);
      setLoading(true);
      
      // Check cache first
      if (cache[id]) {
        console.log(`Using cached model: ${id}`);
        setModel(cache[id].clone());
        if (onLoad) onLoad(cache[id]);
        return;
      }
      
      // Get model metadata
      const modelInfo = getModelById(id);
      if (!modelInfo) {
        throw new Error(`Model with ID "${id}" not found in registry`);
      }
      
      console.log(`Loading brain model: ${modelInfo.name} (${id})`);
      
      // Load the model - try high poly version first
      const lowUrl = `assets/models/${id}.glb`;
      const highUrl = `assets/models/high-poly/${id}.glb`;
      
      const loadedModel = await loadModel({ 
        id, 
        lowUrl, 
        highUrl 
      });
      
      // Add to cache for future use
      addToCache(id, loadedModel.clone());
      
      // Set the loaded model
      setModel(loadedModel);
      
      // Call onLoad callback
      if (onLoad) onLoad(loadedModel);
      
    } catch (err) {
      console.error(`Failed to load model ${id}:`, err);
      const error = err instanceof Error ? err : new Error(String(err));
      setLocalError(error);
      
      // Call onError callback
      if (onError) onError(error);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  }, [id, cache, addToCache, setLoading, onLoad, onError]);
  
  // Load model whenever ID changes
  useEffect(() => {
    if (!id) return;
    loadBrainModel();
    
    // Cleanup function
    return () => {
      setModel(null);
      setCurrentModelRef(null);
    };
  }, [id, loadBrainModel, setCurrentModelRef]);
  
  // Update the modelRef whenever the model changes
  useEffect(() => {
    if (modelRef.current && model) {
      // Clear any existing children - add null check for TypeScript
      if (modelRef.current && modelRef.current.children.length > 0) {
        while (modelRef.current.children.length > 0 && modelRef.current.children[0]) {
          modelRef.current.remove(modelRef.current.children[0]);
        }
      }
      
      // Add the new model as a child
      modelRef.current.add(model);
      
      // Update material properties if specified
      if (wireframe || opacity < 1 || color) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            // Handle both single materials and material arrays
            const materials = Array.isArray(child.material) 
              ? child.material 
              : [child.material];
            
            materials.forEach((material) => {
              if (material instanceof THREE.Material) {
                // Apply wireframe if material supports it
                if (wireframe !== undefined && 'wireframe' in material) {
                  (material as THREE.MeshBasicMaterial).wireframe = wireframe;
                }

                // Apply opacity if not 1
                if (opacity < 1) {
                  material.transparent = true;
                  material.opacity = opacity;
                }

                // Apply color if specified and material supports it
                if (color && 'color' in material) {
                  (material as THREE.MeshStandardMaterial).color = new THREE.Color(color);
                }
              }
            });
          }
        });
      }
      
      // Update the global reference
      if (modelRef.current) {
        setCurrentModelRef(modelRef.current);
      }
    }
  }, [model, wireframe, opacity, color, setCurrentModelRef]);
  
  // Animation updates
  useFrame((state, delta) => {
    if (modelRef.current) {
      if (localLoading) {
        // Rotate loading indicator
        modelRef.current.rotation.y += delta * 0.5;
      } else if (autoRotate && model) {
        // Rotate model if autoRotate is enabled
        modelRef.current.rotation.y += delta * 0.2;
      }
    }
  });
  
  // Apply proper cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (model) {
        // Proper Three.js resource cleanup
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            
            if (child.material) {
              const materials = Array.isArray(child.material) 
                ? child.material 
                : [child.material];
              
              materials.forEach(material => {
                if (material.map) material.map.dispose();
                if (material.normalMap) material.normalMap.dispose();
                if (material.specularMap) material.specularMap.dispose();
                if (material.envMap) material.envMap.dispose();
                material.dispose();
              });
            }
          }
        });
      }
    };
  }, [model]);
  
  return (
    <group ref={modelRef} name={id || 'brain-model-container'}>
      {/* The model will be added to this group by the useEffect */}
      {localLoading && (
        // Loading indicator - simple spinning cube
        <mesh scale={[0.5, 0.5, 0.5]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ffaa00" />
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
            <lineBasicMaterial color="#ffffff" />
          </lineSegments>
        </mesh>
      )}
      
      {localError && (
        // Error indicator - red cube
        <mesh scale={[0.7, 0.7, 0.7]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff0000" />
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
            <lineBasicMaterial color="#ffffff" />
          </lineSegments>
        </mesh>
      )}
    </group>
  );
});

BrainModel.displayName = 'BrainModel';

export default BrainModel;