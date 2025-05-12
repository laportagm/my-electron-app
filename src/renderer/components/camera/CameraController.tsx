import React, { useCallback } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useCamera } from '@/hooks/useCamera';
import { useAppStore } from '@/store/useAppStore';

/**
 * Enhanced camera controller component with orbit controls
 * and utility buttons for camera manipulation
 */
export const CameraController: React.FC = React.memo(() => {
  const { controlsRef } = useCamera();
  
  return (
    <OrbitControls 
      ref={controlsRef} 
      enablePan 
      enableZoom 
      enableRotate 
      makeDefault
    />
  );
});

/**
 * Camera control UI component that can be placed in the scene
 */
export const CameraControlsUI: React.FC = React.memo(() => {
  const resetView = useAppStore(state => state.resetView);
  const focusOnModel = useAppStore(state => state.focusOnModel);
  
  return (
    <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-2.5 p-1 bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full">
      <CameraButton onClick={resetView}>Reset View</CameraButton>
      <CameraButton onClick={focusOnModel}>Focus Model</CameraButton>
    </div>
  );
});

interface CameraButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}

const CameraButton: React.FC<CameraButtonProps> = React.memo(({ 
  children, 
  onClick, 
  active = false 
}) => {
  // Memoize handler to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);
  
  return (
    <button
      onClick={handleClick}
      className={`px-3 py-1.5 text-sm rounded-full ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      } transition-colors duration-150`}
    >
      {children}
    </button>
  );
});

// Set display names for debugging
CameraController.displayName = 'CameraController';
CameraControlsUI.displayName = 'CameraControlsUI';
CameraButton.displayName = 'CameraButton';