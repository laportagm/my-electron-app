import React, { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Absolutely minimal component that just shows a rotating cube
function FallbackCube() {
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Create memoized geometry for better performance
  const boxGeometryProps = React.useMemo(() => ({ args: [1, 1, 1] as [number, number, number] }), []);
  const edgesGeometryProps = React.useMemo(() => ({ args: [new THREE.BoxGeometry(1, 1, 1)] }), []);

  // Memoize material props
  const materialProps = React.useMemo(() => ({ color: "#ff0000" }), []);
  const lineMaterialProps = React.useMemo(() => ({ color: "#ffffff" }), []);

  // Rotate the cube on every frame
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry {...boxGeometryProps} />
      <meshStandardMaterial {...materialProps} />
      <lineSegments>
        <edgesGeometry {...edgesGeometryProps} />
        <lineBasicMaterial {...lineMaterialProps} />
      </lineSegments>
    </mesh>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(FallbackCube);