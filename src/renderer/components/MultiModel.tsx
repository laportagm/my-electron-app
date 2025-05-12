import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import { loadModel } from '@/utils/loadModel';
import { getModelById } from '@/utils/modelRegistry';
import * as THREE from 'three';

// Identify spinal nerve models
const SPINAL_MODEL_IDS = [
  'SpinalNerves1',
  'SpinalNerves2',
  'SpinalNerves3',
  'SpinalNerves4',
  'SpinalNerves5',
  'SpinalNerves6',
];

// Custom color assignments for each spinal model
const SPINAL_COLORS = {
  'SpinalNerves1': '#ff5555',
  'SpinalNerves2': '#55ff55',
  'SpinalNerves3': '#5555ff',
  'SpinalNerves4': '#ffff55',
  'SpinalNerves5': '#ff55ff',
  'SpinalNerves6': '#55ffff',
};

interface MultiModelProps {
  showSpinalModels: boolean;
}

export default function MultiModel({ showSpinalModels }: MultiModelProps) {
  const setCurrentModelRef = useAppStore(state => state.setCurrentModelRef);
  const containerRef = useRef<THREE.Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedModels, setLoadedModels] = useState<Record<string, THREE.Group>>({});
  
  // Load all spinal models when showSpinalModels changes to true
  useEffect(() => {
    if (!showSpinalModels) return;
    
    const loadAllSpinalModels = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Loading all spinal models...`);
        
        // Store loaded models 
        const newlyLoadedModels: Record<string, THREE.Group> = {};
        
        // Load each spinal model
        for (const id of SPINAL_MODEL_IDS) {
          try {
            // Get model metadata
            const modelInfo = getModelById(id);
            if (!modelInfo) {
              console.warn(`Model with ID "${id}" not found in registry`);
              continue;
            }
            
            console.log(`Loading spinal model: ${modelInfo.name} (${id})`);
            
            // Load the model - try high poly version first
            const lowUrl = `assets/models/${id}.glb`;
            const highUrl = `assets/models/high-poly/${id}.glb`;
            
            const loadedModel = await loadModel({ 
              id, 
              lowUrl, 
              highUrl 
            });
            
            // Apply custom color to differentiate models
            applyCustomColorToModel(loadedModel, SPINAL_COLORS[id as keyof typeof SPINAL_COLORS] || '#ffffff');
            
            // Position adjustment based on model ID
            positionModel(loadedModel, id);
            
            // Store the loaded model
            newlyLoadedModels[id] = loadedModel;
          } catch (err) {
            console.error(`Failed to load model ${id}:`, err);
          }
        }
        
        // Update state with all loaded models
        setLoadedModels(newlyLoadedModels);
        
      } catch (err) {
        console.error(`Failed to load spinal models:`, err);
        setError(`Failed to load models: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllSpinalModels();
    
  }, [showSpinalModels]);
  
  // Update the containerRef whenever loadedModels changes
  useEffect(() => {
    if (containerRef.current) {
      // Register container with global state
      if (containerRef.current) {
        setCurrentModelRef(containerRef.current);
      }
      
      // Clear existing models first - with null check to satisfy TypeScript
      if (containerRef.current && containerRef.current.children.length > 0) {
        while (containerRef.current.children.length > 0 && containerRef.current.children[0]) {
          containerRef.current.remove(containerRef.current.children[0]);
        }
      }
      
      // Add all loaded models to the container
      Object.values(loadedModels).forEach(model => {
        containerRef.current?.add(model);
      });
    }
  }, [loadedModels, setCurrentModelRef]);
  
  // Apply a custom color to differentiate the models
  function applyCustomColorToModel(model: THREE.Group, color: string) {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.color.set(color);
                mat.emissive.set(color);
                mat.emissiveIntensity = 0.2;
                mat.needsUpdate = true;
              }
            });
          } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color.set(color);
            mesh.material.emissive.set(color);
            mesh.material.emissiveIntensity = 0.2;
            mesh.material.needsUpdate = true;
          }
        }
      }
    });
  }
  
  // Position models relative to each other based on ID
  function positionModel(model: THREE.Group, id: string) {
    // Calculate index for vertical positioning
    const index = SPINAL_MODEL_IDS.indexOf(id);

    if (index !== -1) {
      // Create a circular arrangement to showcase all models
      const angleStep = (2 * Math.PI) / SPINAL_MODEL_IDS.length;
      const radius = 2; // Distance from center

      // Position in a circle
      const angle = angleStep * index;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      // Set position with vertical staggering for better visibility
      model.position.set(x, index * 0.2 - 1, z);

      // Rotate to face center
      model.rotation.set(0, angle + Math.PI, 0);

      // Slightly tip forward
      model.rotation.x = 0.2;
    }
  }
  
  // Simple animation for loading indicator
  useFrame((state, delta) => {
    if (containerRef.current && loading) {
      // Rotate loading indicator
      containerRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <group ref={containerRef} name="spinal-models-container">
      {/* The models will be added to this group by the useEffect */}
      
      {/* Show loading indicator if loading */}
      {loading && (
        <mesh scale={[0.5, 0.5, 0.5]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ffaa00" />
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
            <lineBasicMaterial color="#ffffff" />
          </lineSegments>
        </mesh>
      )}
      
      {/* Show error indicator if there was an error */}
      {error && (
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
}