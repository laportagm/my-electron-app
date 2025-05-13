import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid, PerspectiveCamera, GizmoHelper, GizmoViewport } from '@react-three/drei'
import PassiveOrbitControls from './camera/PassiveOrbitControls'
import BrainModel from './BrainModel'
import MultipleModels from './MultipleModels'
import FallbackCube from './FallbackCube'
import PerformanceMonitor from './performance/PerformanceMonitor'
import AnnotationLayer from './annotations/AnnotationLayer'
import { ControlPanel } from './controls/ControlPanel'
import { useAppStore, shallow } from '@/store/useAppStore'
import * as THREE from 'three'

interface NeuroSceneProps {
  className?: string;
}

// CameraController component to connect orbit controls to Zustand store
const CameraController = memo(function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Use individual selectors to prevent unnecessary re-renders
  const setOrbitControlsRef = useAppStore(state => state.setOrbitControlsRef);
  const setCameraRef = useAppStore(state => state.setCameraRef);

  // Use refs to track previous values and prevent unnecessary updates
  const prevControlsRef = useRef<any>(null);
  const prevCameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // This effect efficiently handles both refs and avoids update loops
  useEffect(() => {
    // Handle orbit controls ref
    if (controlsRef.current && controlsRef.current !== prevControlsRef.current) {
      prevControlsRef.current = controlsRef.current;
      // Break the synchronous cycle with requestAnimationFrame
      const currentControls = controlsRef.current;
      requestAnimationFrame(() => {
        setOrbitControlsRef(currentControls);
      });
    }

    // Handle camera ref
    if (camera instanceof THREE.PerspectiveCamera && camera !== prevCameraRef.current) {
      prevCameraRef.current = camera;
      // Break the synchronous cycle with requestAnimationFrame
      const currentCamera = camera;
      requestAnimationFrame(() => {
        setCameraRef(currentCamera);
      });
    }

    // Only clean up when component unmounts
    return () => {
      // Use requestAnimationFrame to avoid cleanup during render
      requestAnimationFrame(() => {
        // Only clear if component is truly unmounting
        if (!controlsRef.current && prevControlsRef.current) {
          setOrbitControlsRef(null);
          prevControlsRef.current = null;
        }

        // Camera might be present in React Three Fiber even after unmount,
        // so we check if we're in an unmounting state differently
        const unmountCheck = document.querySelector('canvas') === null;
        if (unmountCheck && prevCameraRef.current) {
          setCameraRef(null);
          prevCameraRef.current = null;
        }
      });
    };
  }, [setOrbitControlsRef, setCameraRef, camera]);

  return <PassiveOrbitControls ref={controlsRef} enablePan enableZoom enableRotate />;
});

// Debug Panel - extracted as separate component for better rendering isolation
const DebugPanel = memo(({ isVisible }: { isVisible: boolean }) => {
  // Use individual selectors to prevent unnecessary re-renders
  const showMultiple = useAppStore(state => state.showMultiple);
  const selectedId = useAppStore(state => state.selectedId);
  const selectedIds = useAppStore(state => state.selectedIds);
  const isLoading = useAppStore(state => state.isLoading);

  if (!isVisible) return null;

  return (
    <div className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded text-xs shadow-lg select-none">
      <div>Debug Mode: Enabled</div>
      <div>Mode: {showMultiple ? 'Multiple Models' : 'Single Model'}</div>
      <div>Selected: {showMultiple ? selectedIds.length + ' models' : selectedId || 'None'}</div>
      <div>Loading Status: {isLoading ? 'Loading...' : 'Idle'}</div>
    </div>
  );
});

// Loading Overlay - extracted as separate component
const LoadingOverlay = memo(({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <div className="text-sm font-medium">Loading model...</div>
      </div>
    </div>
  );
});

// Control buttons component
const ControlButtons = memo(({ debugMode, setDebugMode }: {
  debugMode: boolean;
  setDebugMode: (newValue: boolean | ((prevState: boolean) => boolean)) => void
}) => {
  // Use individual selectors for actions
  const resetViewAction = useAppStore(state => state.resetView);
  const focusOnModelAction = useAppStore(state => state.focusOnModel);
  const togglePerformanceMonitorAction = useAppStore(state => state.togglePerformanceMonitor);
  const showPerformanceMonitor = useAppStore(state => state.showPerformanceMonitor);

  // Memoize callback functions to prevent unnecessary re-renders
  const resetView = useCallback(() => {
    resetViewAction();
  }, [resetViewAction]);

  const focusOnModel = useCallback(() => {
    focusOnModelAction();
  }, [focusOnModelAction]);

  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, [setDebugMode]);

  const togglePerformanceMonitor = useCallback(() => {
    togglePerformanceMonitorAction();
  }, [togglePerformanceMonitorAction]);

  // Take screenshot function
  const takeScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'brain-model-screenshot.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }, []);

  return (
    <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-1.5 bg-glass shadow-neumorph rounded-full">
      {/* Camera Controls */}
      <div className="flex items-center gap-1 mr-2">
        <button
          onClick={resetView}
          className="btn-circle text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors tooltip"
          aria-label="Reset camera view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="tooltip-text -mt-8">Reset View</span>
        </button>

        <button
          onClick={focusOnModel}
          className="btn-circle text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors tooltip"
          aria-label="Focus on selected model"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
          <span className="tooltip-text -mt-8">Focus on Model</span>
        </button>
      </div>

      {/* Viewing Modes */}
      <div className="bg-white/40 dark:bg-gray-900/40 h-6 w-px mx-1"></div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => console.log('Wireframe mode')}
          className="btn-circle text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors tooltip"
          aria-label="Wireframe mode"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
          </svg>
          <span className="tooltip-text -mt-8">Wireframe</span>
        </button>

        <button
          onClick={() => console.log('X-ray mode')}
          className="btn-circle text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors tooltip"
          aria-label="X-ray view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2 8.16l8-2.47l-6.39 5.31l6.39 5.31l-8-2.47l-2 8.16l-2-8.16l-8 2.47l6.39-5.31L2 7.69l8 2.47L12 2z"></path>
          </svg>
          <span className="tooltip-text -mt-8">X-Ray View</span>
        </button>
      </div>

      {/* Development Tools */}
      <div className="bg-white/40 dark:bg-gray-900/40 h-6 w-px mx-1"></div>

      <button
        onClick={toggleDebugMode}
        className={`btn-circle transition-colors tooltip ${
          debugMode
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-label={debugMode ? "Turn off debug mode" : "Turn on debug mode"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
        <span className="tooltip-text -mt-8">Debug: {debugMode ? 'ON' : 'OFF'}</span>
      </button>

      <button
        onClick={togglePerformanceMonitor}
        className={`btn-circle transition-colors tooltip ${
          showPerformanceMonitor
            ? 'bg-purple-500 text-white hover:bg-purple-600'
            : 'bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-label={showPerformanceMonitor ? "Hide performance monitor" : "Show performance monitor"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span className="tooltip-text -mt-8">Performance: {showPerformanceMonitor ? 'ON' : 'OFF'}</span>
      </button>

      {/* Screenshot button */}
      <button
        onClick={takeScreenshot}
        className="btn-circle text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors tooltip"
        aria-label="Take screenshot"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span className="tooltip-text -mt-8">Screenshot</span>
      </button>
    </div>
  );
});

// Main scene component
function NeuroScene({ className = '' }: NeuroSceneProps) {
  const [debugMode, setDebugMode] = useState(true);

  // Use individual selectors to prevent unnecessary re-renders
  const selectedId = useAppStore(state => state.selectedId);
  const showMultiple = useAppStore(state => state.showMultiple);
  const isLoading = useAppStore(state => state.isLoading);
  const showPerformanceMonitor = useAppStore(state => state.showPerformanceMonitor);
  const showControlPanel = useAppStore(state => state.showControlPanel);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0,1,7]} fov={50} />
        <ambientLight intensity={0.9} />
        <spotLight position={[10,10,10]} angle={0.25} penumbra={0.5} intensity={200} />
        <directionalLight position={[-5,5,5]} intensity={0.8} />

        <Grid position={[0,-2.05,0]} args={[30,30]} cellSize={0.5} cellThickness={0.8}
              cellColor="#777777" sectionSize={2.5} sectionThickness={1.2}
              sectionColor="#555555" fadeDistance={35} fadeStrength={1} infiniteGrid />

        {showMultiple ? (
          <MultipleModels />
        ) : selectedId ? (
          <>
            <BrainModel modelId={selectedId} />
            {/* Add the AnnotationLayer component for the currently selected model */}
            <AnnotationLayer modelId={selectedId} />
          </>
        ) : (
          <FallbackCube />
        )}

        <CameraController />
        <GizmoHelper alignment="bottom-right" margin={[80,80]}>
          <GizmoViewport axisColors={["#ff3030","#30ff30","#3030ff"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>

      <ControlButtons debugMode={debugMode} setDebugMode={setDebugMode} />
      <DebugPanel isVisible={debugMode} />
      <LoadingOverlay isLoading={isLoading} />
      {/* Temporarily disabling PerformanceMonitor until React Three Fiber integration is fixed */}
      {/* {(debugMode || showPerformanceMonitor) && <PerformanceMonitor />} */}
      {showControlPanel && <ControlPanel modelId={selectedId} />}
    </div>
  );
}

export default memo(NeuroScene);