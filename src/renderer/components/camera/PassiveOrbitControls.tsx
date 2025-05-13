import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { extend, useThree } from '@react-three/fiber';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Extend Three.js with OrbitControls
extend({ ThreeOrbitControls });

/**
 * Enhanced OrbitControls component that ensures all event listeners are passive
 * to prevent wheel event violations and improve scrolling performance
 */
const PassiveOrbitControls = forwardRef((props: any, ref) => {
  const controlsRef = useRef<ThreeOrbitControls>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  
  // Forward the ref to parent components
  useImperativeHandle(ref, () => controlsRef.current);

  // After the component mounts, replace the event listeners with passive ones
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const controls = controlsRef.current;
    const domElement = gl.domElement;
    
    // Store original event listeners
    const originalAddEventListener = domElement.addEventListener;
    const originalRemoveEventListener = domElement.removeEventListener;
    
    // Override addEventListener to make wheel events passive
    domElement.addEventListener = function(type, listener, options) {
      if (type === 'wheel' || type === 'mousewheel' || type === 'DOMMouseScroll') {
        // Force the passive option for wheel events
        const passiveOptions = { 
          ...(typeof options === 'object' ? options : {}), 
          passive: true 
        };
        return originalAddEventListener.call(this, type, listener, passiveOptions);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Override removeEventListener to match our modified addEventListener
    domElement.removeEventListener = function(type, listener, options) {
      if (type === 'wheel' || type === 'mousewheel' || type === 'DOMMouseScroll') {
        const passiveOptions = { 
          ...(typeof options === 'object' ? options : {}), 
          passive: true 
        };
        return originalRemoveEventListener.call(this, type, listener, passiveOptions);
      }
      return originalRemoveEventListener.call(this, type, listener, options);
    };
    
    // Force controls to re-initialize all event listeners with our overridden methods
    controls.dispose();
    controls.connect();
    
    return () => {
      // Restore original methods when component unmounts
      if (domElement) {
        domElement.addEventListener = originalAddEventListener;
        domElement.removeEventListener = originalRemoveEventListener;
      }
      
      // Clean up controls
      if (controls) {
        controls.dispose();
      }
    };
  }, [gl.domElement, controlsRef]);
  
  return (
    <group ref={groupRef}>
      <DreiOrbitControls ref={controlsRef} {...props} />
    </group>
  );
});

PassiveOrbitControls.displayName = 'PassiveOrbitControls';

export default PassiveOrbitControls;