import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, GizmoHelper, GizmoViewport, Environment, Center, Text } from '@react-three/drei'
import * as THREE from 'three'
// Import AppState type from the store file
import { useAppStore, AppState } from '@/store/useAppStore'
import { loadModel } from '@/utils/loadModel'
import { getModelById, brainModels, logModelPaths } from '@/utils/modelRegistry'
import LoadingOverlay from './LoadingOverlay'
import { Layers } from 'lucide-react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

type ModelId = string;
type Model3D = THREE.Group;

function useModelControls() {
  const resetView = useAppStore(useCallback((state: AppState) => state.resetView, []));
  const focusOnModel = useAppStore(useCallback((state: AppState) => state.focusOnModel, []));
  const setLoading = useAppStore(useCallback((state: AppState) => state.setLoading, []));
  const setCurrentModelRef = useAppStore(useCallback((state: AppState) => state.setCurrentModelRef, []));
  const setCameraRef = useAppStore(useCallback((state: AppState) => state.setCameraRef, []));
  const setOrbitControlsRef = useAppStore(useCallback((state: AppState) => state.setOrbitControlsRef, []));
  const setSelected = useAppStore(useCallback((state: AppState) => state.setSelected, []));
  return { resetView, focusOnModel, setLoading, setCurrentModelRef, setCameraRef, setOrbitControlsRef, setSelected };
}

function DebugCube() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => setVisible(v => !v), 2000);
    return () => clearInterval(timer);
  }, []);
  if (!visible) return null;
  return (
    <mesh position={[0, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" roughness={0.5} />
    </mesh>
  );
}

// Add a debug component to help diagnose model loading
function ModelDebugger() {
  const { scene } = useThree();
  const selectedId = useAppStore(s => s.selectedId);
  const currentModel = useAppStore(s => s.currentModelRef);
  
  // Log model information when selected changes
  useEffect(() => {
    if (selectedId) {
      console.log('🔍 Model debugger - Selected ID:', selectedId);
      const modelInfo = getModelById(selectedId);
      console.log('Model information:', modelInfo);
      
      // Check if model exists in the scene
      if (currentModel) {
        console.log('Current model in scene:', currentModel);
      } else {
        console.warn('No model in scene yet for selected ID:', selectedId);
      }
      
      // Log all scene children
      console.log('Current scene children:', scene.children);
      
      // Log all available model paths for debugging
      logModelPaths();
    }
  }, [selectedId, currentModel, scene]);
  
  // Detect if WebGL is available
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.error('WebGL not supported in this browser!');
      } else {
        console.log('WebGL is supported! Extensions:', gl.getSupportedExtensions());
      }
    } catch (e) {
      console.error('Error checking WebGL support:', e);
    }
  }, []);
  
  return null; // This component doesn't render anything
}

function DracoTestModel() {
  const { scene } = useThree();
  useEffect(() => {
    // Test if we can create and add objects to the scene
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(2, 0, 0);
    cube.name = 'debugCube';
    scene.add(cube);
    
    console.log('Added debug cube to scene:', cube);
    
    return () => {
      const debugCube = scene.getObjectByName('debugCube');
      if (debugCube) {
        scene.remove(debugCube);
        if (debugCube instanceof THREE.Mesh) {
          debugCube.geometry.dispose();
          if (Array.isArray(debugCube.material)) {
            debugCube.material.forEach(mat => mat.dispose());
          } else {
            debugCube.material.dispose();
          }
        }
      }
    };
  }, [scene]);
  return null;
}

function disposeSingleMaterial(material: THREE.Material) {
  if (!material) return;
  (Object.values(material) as any[]).forEach(val => { if (val?.dispose instanceof Function) val.dispose(); });
  material.dispose();
}
function disposeMaterial(mat: THREE.Material | THREE.Material[]) {
  Array.isArray(mat) ? mat.forEach(disposeSingleMaterial) : disposeSingleMaterial(mat);
}

function BrainModel() {
  const { scene } = useThree();
  const selectedId = useAppStore(s => s.selectedId);
  const modelRef = useRef<Model3D | null>(null);
  const [loadedId, setLoadedId] = useState<ModelId | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { setCurrentModelRef, setLoading, setSelected } = useModelControls();

  useEffect(() => {
    if (modelRef.current) setCurrentModelRef(modelRef.current);
    return () => setCurrentModelRef(null);
  }, [loadedId]);

  useEffect(() => {
    let mounted = true;
    async function loadAndShow() {
      if (!selectedId) {
        if (modelRef.current) {
          scene.remove(modelRef.current);
          modelRef.current.traverse(o => {
            if ((o as THREE.Mesh).isMesh) {
              (o as THREE.Mesh).geometry.dispose();
              disposeMaterial((o as THREE.Mesh).material);
            }
          });
          modelRef.current = null;
          setLoadedId(null);
          setCurrentModelRef(null);
        }
        return;
      }
      
      if (loadedId === selectedId) return;
      
      console.log(`🧠 Loading brain model: ${selectedId}`);
      setLoading(true);
      setLoadError(null);
      
      if (modelRef.current) {
        scene.remove(modelRef.current);
        modelRef.current.traverse(o => {
          if ((o as THREE.Mesh).isMesh) {
            (o as THREE.Mesh).geometry.dispose();
            disposeMaterial((o as THREE.Mesh).material);
          }
        });
        modelRef.current = null;
      }
      
      try {
        const info = getModelById(selectedId);
        if (!info) {
          throw new Error(`Model information not found for ID: ${selectedId}`);
        }
        
        console.log(`Loading model with info:`, info);
        
        const model = await loadModel({ 
          id: selectedId, 
          lowUrl: info.lowPolyUrl, 
          highUrl: info.highPolyUrl 
        });
        
        if (!mounted) return;
        
        console.log(`Model loaded successfully:`, model);
        modelRef.current = model;
        model.userData.id = selectedId;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        model.position.sub(box.getCenter(new THREE.Vector3()));
        
        // Adjust scale if needed
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        if (maxSize > 10) {
          const scale = 5 / maxSize;
          model.scale.set(scale, scale, scale);
          console.log(`Model scaled by ${scale} to fit view`);
        }
        
        scene.add(model);
        console.log(`Model added to scene`);
        setLoadedId(selectedId);
      } catch (e: any) {
        console.error(`Error loading model:`, e);
        setLoadError(e.message || 'Unknown error loading model');
        
        // Try to load the next model after a delay if this one failed
        setTimeout(() => {
          if (!mounted) return;
          const idx = brainModels.findIndex(m => m.id === selectedId);
          const next = brainModels[(idx + 1) % brainModels.length];
          if (next.id !== selectedId) {
            console.log(`Trying next model: ${next.id}`);
            setSelected(next.id);
          }
        }, 2000);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    loadAndShow();
    return () => { mounted = false; };
  }, [selectedId]);

  if (loadError) return (
    <Center>
      <Text color="red" fontSize={0.2} maxWidth={4} textAlign="center">{loadError}</Text>
    </Center>
  );
  return null;
}

function ViewportInfo() {
  const sel = useAppStore(s => s.selectedId);
  if (sel) return null;
  return (
    <group position={[0, -2.5, 0]}> 
      <Text color="#9ca3af" fontSize={0.2} anchorX="center" anchorY="middle">
        Select a brain region from the panel
      </Text>
    </group>
  );
}

function Initialization() {
  const sel = useAppStore(s => s.selectedId);
  const loading = useAppStore(s => s.isLoading);
  const { setSelected } = useModelControls();
  
  // Log all available models for debugging
  useEffect(() => {
    console.log('Available brain models:', brainModels);
    logModelPaths();
  }, []);
  
  useEffect(() => {
    if (!sel && !loading && brainModels.length) {
      console.log(`Auto-selecting first model: ${brainModels[0].id}`);
      const t = setTimeout(() => setSelected(brainModels[0].id), 100);
      return () => clearTimeout(t);
    }
  }, [sel, loading]);
  
  return null;
}

interface NeuroSceneProps { className?: string; }
export default function NeuroScene({ className = '' }: NeuroSceneProps) {
  const isLoading = useAppStore(s => s.isLoading);
  const selectedId = useAppStore(s => s.selectedId);
  const sidePanel = useAppStore(s => s.sidePanelOpen);
  const currentModel = useAppStore(s => s.currentModelRef);
  const [debugMode, setDebugMode] = useState(true); // Set to true by default for debugging
  const [cameraInfo, setCameraInfo] = useState('');
  const { resetView, focusOnModel, setCameraRef, setOrbitControlsRef } = useModelControls();

  const handleReset = useCallback(() => resetView(), [resetView]);
  const handleFocus = useCallback(() => focusOnModel(), [focusOnModel]);
  const camRef = useCallback((cam: THREE.PerspectiveCamera | null) => {
    if (cam) { setCameraRef(cam); if (debugMode) setCameraInfo(`Pos: ${cam.position.x.toFixed(1)}, ${cam.position.y.toFixed(1)}, ${cam.position.z.toFixed(1)}`); }
  }, [debugMode]);
  const orbitRef = useCallback((o: any) => { if (o) setOrbitControlsRef(o); }, []);
  const toggleDebug = () => setDebugMode(dm => !dm);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && <LoadingOverlay />}
      {!isLoading && !currentModel && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg text-center z-10">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Select a Brain Model</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            {sidePanel ? 'Choose a model from the side panel.' : <>Click <span className="font-bold">Models</span> to open panel.</>}
          </p>
          <Layers size={32} className="text-blue-500 dark:text-blue-400" />
        </div>
      )}

      <Canvas shadows gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => { if (debugMode) console.log('WebGL ready:', gl); }}>
        <PerspectiveCamera makeDefault position={[0,1,7]} fov={50} near={0.1} far={1000} ref={camRef} onUpdate={cam => debugMode && setCameraInfo(`Pos: ${cam.position.x.toFixed(1)}, ${cam.position.y.toFixed(1)}, ${cam.position.z.toFixed(1)}`)} />
        <ambientLight intensity={0.9} />
        <spotLight position={[10,10,10]} angle={0.25} penumbra={0.5} intensity={200} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-5,5,5]} intensity={0.8} />
        <hemisphereLight args={["#e0e5ff","#404060",0.8]} />

        <Grid position={[0,-2.05,0]} args={[30,30]} cellSize={0.5} cellThickness={0.8} cellColor="#777777" sectionSize={2.5} sectionThickness={1.2} sectionColor="#555555" fadeDistance={35} fadeStrength={1} infiniteGrid />
        <Environment preset="sunset" background blur={0.5} />

        {debugMode && <axesHelper args={[3]} />}
        {debugMode && <><DracoTestModel /><DebugCube /></>}
        {debugMode && <ModelDebugger />}

        <Initialization />
        <Center top><BrainModel /></Center>
        {!isLoading && !selectedId && <ViewportInfo />}

        <OrbitControls ref={orbitRef} enablePan enableZoom enableRotate minDistance={1} maxDistance={30} maxPolarAngle={Math.PI/1.6} makeDefault onChange={(e) => {
            // guard against undefined event or missing target
            if (!e?.target) return;
            const obj = (e.target as any).object as THREE.PerspectiveCamera | undefined;
            if (debugMode && obj?.isPerspectiveCamera) {
              setCameraInfo(
                `Pos: ${obj.position.x.toFixed(1)}, ${obj.position.y.toFixed(1)}, ${obj.position.z.toFixed(1)}`
              );
            }
          }} />
        <GizmoHelper alignment="bottom-right" margin={[80,80]}><GizmoViewport axisColors={["#ff3030","#30ff30","#3030ff"]} labelColor="white" /></GizmoHelper>
      </Canvas>

      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-2.5 p-1 bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full">
        <button onClick={handleReset} className="px-3 py-1.5 text-sm rounded-full bg-blue-500 text-white">Reset View</button>
        <button onClick={handleFocus} disabled={!currentModel||isLoading} className={`px-3 py-1.5 text-sm rounded-full ${(!currentModel||isLoading) ? 'bg-gray-400 text-gray-300' : 'bg-blue-500 text-white'}`}>Focus Model</button>
        <button onClick={toggleDebug} className={`px-3 py-1.5 text-sm rounded-full ${debugMode ? 'bg-green-500' : 'bg-gray-500'} text-white`}>Debug: {debugMode?'ON':'OFF'}</button>
      </div>

      {debugMode && (
        <div className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded text-xs shadow-lg select-none">
          <div>Selected ID: {selectedId||'None'}</div>
          <div>Model Loaded: {currentModel?'Yes':'No'}</div>
          <div>Camera: {cameraInfo}</div>
          <div>Loading: {isLoading?'Yes':'No'}</div>
        </div>
      )}
    </div>
  )
}
