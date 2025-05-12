import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

/**
 * Hook to manage camera and orbit controls references
 * Extracts camera logic from scene components for better separation of concerns
 */
export function useCamera() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  const setOrbitControlsRef = useAppStore(state => state.setOrbitControlsRef);
  const setCameraRef = useAppStore(state => state.setCameraRef);

  // Update refs in store when available
  useEffect(() => {
    if (controlsRef.current) {
      setOrbitControlsRef(controlsRef.current);
    }
    
    if (camera instanceof THREE.PerspectiveCamera) {
      setCameraRef(camera);
    }

    // Cleanup when component unmounts
    return () => {
      setOrbitControlsRef(null);
      setCameraRef(null);
    };
  }, [setOrbitControlsRef, setCameraRef, camera]);

  return {
    controlsRef
  };
}

/**
 * Helper function to focus camera on a specific object
 */
export function focusOnObject(
  object: THREE.Object3D,
  controls: any,
  camera: THREE.PerspectiveCamera,
  options: { padding?: number; smooth?: boolean; duration?: number } = {}
) {
  if (!object || !controls || !camera) return;
  
  const { padding = 1.2, smooth = true, duration = 1000 } = options;
  
  // Calculate the bounding box of the model
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  // Calculate optimal distance based on model size and camera FOV
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const distance = (maxDim / 2) / Math.tan(fov / 2) * padding;
  
  if (smooth) {
    // Animate to new position (can be implemented with GSAP or other animation library)
    // For now, we just set it directly
    controls.target.copy(center);
    camera.position.copy(center.clone().add(new THREE.Vector3(0, 0, distance)));
    controls.update();
  } else {
    // Immediately set positions
    controls.target.copy(center);
    camera.position.copy(center.clone().add(new THREE.Vector3(0, 0, distance)));
    controls.update();
  }
}