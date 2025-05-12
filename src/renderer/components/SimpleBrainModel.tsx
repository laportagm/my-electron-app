import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

// This is a simplified model loader component that focuses on stability
export function SimpleBrainModel() {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const selectedId = useAppStore(state => state.selectedId);
  const setCurrentModelRef = useAppStore(state => state.setCurrentModelRef);

  // Create a fallback cube with the given ID and color
  const createCube = (id: string, color = 0xff0000) => {
    const group = new THREE.Group();
    group.name = `Fallback for ${id}`;
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      roughness: 0.7, 
      metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    
    mesh.add(wireframe);
    group.add(mesh);
    
    return group;
  };

  // Clean up a model correctly
  const disposeModel = (model: THREE.Object3D) => {
    model.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  };

  // Load the actual model
  useEffect(() => {
    if (!selectedId || !groupRef.current) return;

    console.log(`Loading model: ${selectedId}`);

    // Clear existing models
    if (groupRef.current.children.length > 0) {
      const childrenToRemove = [...groupRef.current.children];
      childrenToRemove.forEach(child => {
        groupRef.current?.remove(child);
        disposeModel(child);
      });
    }

    // Setup loaders
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);

    // Generate a random color for the fallback cube based on the model ID
    const hashCode = selectedId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const color = Math.abs(hashCode) % 0xffffff;

    // Add a temporary cube while loading
    const tempCube = createCube(selectedId, color);
    groupRef.current.add(tempCube);
    setModelLoaded(false);

    // Try to load the actual model
    const modelPath = `assets/models/${selectedId}.glb`;
    gltfLoader.load(
      modelPath,
      (gltf) => {
        console.log(`Successfully loaded ${selectedId}`);
        
        if (groupRef.current) {
          // Remove loading cube
          groupRef.current.remove(tempCube);
          disposeModel(tempCube);
          
          // Add the loaded model
          const model = gltf.scene;
          
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 10) {
            const scale = 5 / maxDim;
            model.scale.set(scale, scale, scale);
          }
          
          groupRef.current.add(model);
          setModelLoaded(true);
          setCurrentModelRef(groupRef.current);
        }
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading ${selectedId}: ${Math.round(percent)}%`);
      },
      (error) => {
        console.error(`Error loading ${selectedId}:`, error);
        // Keep the fallback cube (already added)
        setModelLoaded(true);
        setCurrentModelRef(groupRef.current);
      }
    );

    // Cleanup function
    return () => {
      // We don't actually remove anything here to prevent flashing
    };
  }, [selectedId]);

  // Rotate the model slightly to show it's working
  useFrame((state, delta) => {
    if (groupRef.current && modelLoaded) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return <group ref={groupRef} position={[0, 0, 0]} />;
}

export default SimpleBrainModel;