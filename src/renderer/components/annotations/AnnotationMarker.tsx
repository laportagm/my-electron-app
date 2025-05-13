import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import type { Annotation } from './types';

interface AnnotationMarkerProps {
  annotation: Annotation;
  onSelect: (id: string) => void;
}

/**
 * A 3D marker component that displays an annotation point in the 3D scene
 * Enhanced with glass-morphism styling and improved animations
 */
const AnnotationMarker: React.FC<AnnotationMarkerProps> = ({ annotation, onSelect }) => {
  const { id, position, title, color = '#4299e1' } = annotation;
  const groupRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [labelVisible, setLabelVisible] = useState(false);

  const selectedAnnotationId = useAppStore(state => state.selectedAnnotationId);
  const isSelected = selectedAnnotationId === id;

  // Show the marker after a brief delay to prevent flash during scene changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      // Short delay before showing label for staggered animation
      setTimeout(() => setLabelVisible(true), 150);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Toggle label visibility on hover/select
  useEffect(() => {
    if (hovered || isSelected) {
      setLabelVisible(true);
    } else {
      // Hide label with slight delay when not hovered/selected
      const timer = setTimeout(() => setLabelVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hovered, isSelected]);

  // Use useFrame for smoother animations
  useFrame(({ clock }) => {
    if (!visible || !groupRef.current || !markerRef.current || !ringRef.current) return;

    // Floating animation for all markers
    const floatY = Math.sin(clock.getElapsedTime() * 1.5) * 0.02;
    groupRef.current.position.y = position.y + floatY;

    // Pulse animation for selected/hovered markers
    if (isSelected) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
      markerRef.current.scale.set(scale, scale, scale);

      // Rotate ring for selected markers
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.5;
    } else if (hovered) {
      markerRef.current.scale.set(1.2, 1.2, 1.2);
      ringRef.current.scale.set(1.2, 1.2, 1.2);
    } else {
      markerRef.current.scale.set(1, 1, 1);
      ringRef.current.scale.set(1, 1, 1);
    }
  });

  // Handle cursor changes
  const handlePointerOver = (e: THREE.Event) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    onSelect(id);
  };

  if (!visible) return null;

  // Enhanced 3D marker with improved visuals
  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main marker sphere */}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? '#ff6b9d' : color}
          transparent
          opacity={0.9}
          roughness={0.3}
          metalness={0.7}
          emissive={hovered || isSelected ? '#ff6b9d' : color}
          emissiveIntensity={hovered || isSelected ? 0.5 : 0.2}
        />
      </mesh>

      {/* Animated ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.1, 0.12, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#ff6b9d' : color}
          side={THREE.DoubleSide}
          transparent
          opacity={isSelected ? 0.8 : 0.6}
        />
      </mesh>

      {/* Outer glow for selected markers */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial
            color="#ff6b9d"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Connector line to base */}
      <mesh position={[0, -0.1, 0]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ff6b9d' : color}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Base point on actual model surface */}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ff6b9d' : color}
          emissive={isSelected ? '#ff6b9d' : color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Light source for glow effect */}
      {(isSelected || hovered) && (
        <pointLight
          position={[0, 0, 0]}
          distance={0.5}
          intensity={1}
          color={isSelected ? '#ff6b9d' : color}
        />
      )}

      {/* Glass-morphism HTML label */}
      <Html
        position={[0, 0.18, 0]}
        center
        distanceFactor={12}
        occlude
        sprite
        transform
        className={`transition-all duration-300 ${
          labelVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className={`bg-glass backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg text-sm
                       max-w-[150px] whitespace-nowrap overflow-hidden text-ellipsis text-center
                       transition-all duration-300 border ${
                         isSelected
                           ? 'bg-brain-pink/80 text-white font-medium border-brain-pink/60'
                           : 'bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-white border-white/20 dark:border-gray-700/50'
                       }`}>
          {title}
        </div>
      </Html>
    </group>
  );
};

export default React.memo(AnnotationMarker);