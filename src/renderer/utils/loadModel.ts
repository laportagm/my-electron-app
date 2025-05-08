import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useAppStore } from '@/store/useAppStore';
import * as THREE from 'three';

interface LoadModelParams {
  id: string;
  lowUrl: string;
  highUrl: string;
}

// Add debug flag to enable detailed diagnostic logging
const DEBUG = true;

/**
 * Creates a simple cube as a fallback when models fail to load
 */
function createFallbackModel(id: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `Fallback for ${id}`;
  
  // Create a simple colored cube as fallback
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ 
    color: '#ff4444', // Changed to bright red for better visibility
    roughness: 0.7,
    metalness: 0.1
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  group.add(mesh);
  
  // Add a wireframe to make it obvious this is a fallback
  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: '#ffffff', linewidth: 2 })
  );
  
  mesh.add(wireframe);
  
  // Add a text label to indicate this is a fallback
  const textGeometry = new THREE.PlaneGeometry(2, 0.5);
  const textMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(0, 1.5, 0);
  
  group.add(textMesh);
  
  // Log that we're using a fallback model
  console.warn(`Using fallback model for ${id} - Original model could not be loaded`);
  
  return group;
}

/**
 * Loads 3D models with LOD (Level of Detail) strategy:
 * 1. Checks cache first
 * 2. Loads low-poly model immediately
 * 3. Loads high-poly model in background
 * 4. Swaps models and updates cache when high-poly is ready
 */
export async function loadModel({ id, lowUrl, highUrl }: LoadModelParams): Promise<THREE.Group> {
  if (DEBUG) {
    console.log('%c[MODEL LOADING]', 'background: #222; color: #bada55', `Attempting to load model: ${id}`);
    console.log(`Low poly URL: ${lowUrl}`);
    console.log(`High poly URL: ${highUrl}`);
  }
  
  // Check if the cache has the model already
  const store = useAppStore.getState();
  if (store.cache[id]) {
    console.log(`Using cached model: ${id}`);
    // Make sure the userData has the id set
    if (!store.cache[id].userData) {
      store.cache[id].userData = { id };
    } else if (!store.cache[id].userData.id) {
      store.cache[id].userData.id = id;
    }
    // Return a clone to avoid modifying the cached version
    const clonedModel = store.cache[id].clone();
    if (DEBUG) console.log('Cached model successfully cloned:', clonedModel);
    return clonedModel; 
  }
  
  // Setup GLTF loader
  const gltfLoader = new GLTFLoader();
  
  // Create container for the model early so we can return it even if loading fails
  const modelContainer = new THREE.Group();
  modelContainer.name = id;
  modelContainer.userData = { id }; // Store the ID in userData for future reference
  
  // Add a simple sphere as a loading indicator
  const loadingIndicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  loadingIndicator.name = 'loading-indicator';
  modelContainer.add(loadingIndicator);
  
  // Setup Draco decoder with CDN fallback
  const dracoLoader = new DRACOLoader();
  
  // Use the CDN version for reliability
  const dracoPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
  
  if (DEBUG) console.log(`Setting Draco decoder path to: ${dracoPath}`);
  dracoLoader.setDecoderPath(dracoPath);
  gltfLoader.setDRACOLoader(dracoLoader);
  
  // Set loading state
  useAppStore.getState().setLoading(true);
  
  try {
    // Load low-poly model
    if (DEBUG) console.log(`Starting load of model: ${id}`);
    const startTime = performance.now();
    
    // Try to load the model
    let model: THREE.Group;
    try {
      if (DEBUG) {
        console.log('%c[MODEL DIAGNOSTICS]', 'background: #222; color: #ff9900');
        console.log(`Trying to load model from: ${lowUrl}`);
      }
      
      model = await loadGLTF(gltfLoader, lowUrl);
      if (DEBUG) console.log('Model loaded successfully:', model);
      
      // Check if the model has any children
      if (model.children.length === 0) {
        console.warn(`Model loaded but has no children: ${id}`);
      }
      
      // Clean up the loading indicator
      const indicator = modelContainer.getObjectByName('loading-indicator');
      if (indicator) modelContainer.remove(indicator);
      
      // Add the model to the container
      modelContainer.add(model);
      
      // Setup ambient occlusion for better visual quality
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          // Make sure materials are properly configured
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.roughness = 0.7;
                  mat.metalness = 0.1;
                  mat.needsUpdate = true;
                }
              });
            } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
              mesh.material.roughness = 0.7;
              mesh.material.metalness = 0.1;
              mesh.material.needsUpdate = true;
            }
          }
        }
      });
      
      // Cache the model for future use
      useAppStore.getState().addToCache(id, modelContainer.clone());
      const loadTime = (performance.now() - startTime) / 1000;
      console.log(`Model ${id} loaded and cached in ${loadTime.toFixed(1)}s`);
      
      // Update loading state
      useAppStore.getState().setLoading(false);
      
      return modelContainer;
    } catch (error) {
      console.error(`Error loading model from ${lowUrl}:`, error);
      
      // Clean up the loading indicator
      const indicator = modelContainer.getObjectByName('loading-indicator');
      if (indicator) modelContainer.remove(indicator);
      
      // Use fallback model
      const fallbackModel = createFallbackModel(id);
      modelContainer.add(fallbackModel);
      
      // Since loading failed, clear loading state
      useAppStore.getState().setLoading(false);
      
      return modelContainer; // Return the fallback model instead of throwing
    }
  } catch (error) {
    console.error(`Model loading failed for ${id}:`, error);
    useAppStore.getState().setLoading(false);
    
    // Return a fallback model instead of throwing
    const fallbackModel = createFallbackModel(id);
    modelContainer.add(fallbackModel);
    return modelContainer;
  }
}

/**
 * Helper function to load a GLTF model
 */
function loadGLTF(loader: GLTFLoader, url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    // Try the original URL
    const originalUrl = url;
    console.log(`Attempting to load GLB from: ${originalUrl}`);
    
    // Add a timestamp to avoid caching issues
    const timestamp = Date.now();
    const urlWithTimestamp = `${originalUrl}?t=${timestamp}`;
    
    // List all possible paths to try
    const fallbackPaths = [
      urlWithTimestamp,
      `/assets/models/${url.split('/').pop()}?t=${timestamp}`,
      `/public/assets/models/${url.split('/').pop()}?t=${timestamp}`,
      `/models/${url.split('/').pop()}?t=${timestamp}`,
      `./assets/models/${url.split('/').pop()}?t=${timestamp}`,
    ];
    
    // Try each path in sequence
    let currentPathIndex = 0;
    
    function tryNextPath() {
      if (currentPathIndex >= fallbackPaths.length) {
        reject(new Error(`Failed to load model after trying ${fallbackPaths.length} different paths.`));
        return;
      }
      
      const currentPath = fallbackPaths[currentPathIndex];
      console.log(`Attempting to load from: ${currentPath} (attempt ${currentPathIndex + 1}/${fallbackPaths.length})`);
      
      // Load the model
      loader.load(
        currentPath,
        (gltf) => {
          // Success! Resolve with the scene
          console.log(`Successfully loaded from: ${currentPath}`);
          resolve(gltf.scene);
        },
        (progress) => {
          // Progress callback
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            if (percent % 25 < 1) { // Log at 0%, 25%, 50%, 75%, 100%
              console.log(`Loading progress: ${Math.floor(percent)}%`);
            }
          }
        },
        (error) => {
          // Error loading from this path, try the next one
          console.warn(`Error loading from ${currentPath}:`, error);
          currentPathIndex++;
          tryNextPath();
        }
      );
    }
    
    // Start trying paths
    tryNextPath();
  });
}
