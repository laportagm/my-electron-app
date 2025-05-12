/**
 * Asset Manager - Centralized system for loading and managing 3D assets
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';
import { assetLogger } from './assetLogger';

// Configuration for asset paths
interface AssetConfig {
  basePath: string;
  modelsPath: string;
  dracoPath: string;
}

// Default configuration with environment-specific paths
const config: AssetConfig = {
  basePath: './',
  modelsPath: 'assets/models',
  dracoPath: 'draco/gltf/', // Use the gltf subfolder by default
};

// Cache for loaded models - exported for testing
export const modelCache = new Map<string, THREE.Group>();

// Initialize loaders
const dracoLoader = new DRACOLoader();
// Export the gltfLoader for testing and reuse
export const gltfLoader = new GLTFLoader();

// Setup the DRACO decoder path - first try local paths, then CDN as fallback
const dracoDecoderUrls = [
  // Local relative paths
  `${config.basePath}${config.dracoPath}`,
  './draco/',
  '../draco/',
  '../../draco/',

  // Absolute paths
  '/draco/',
  '/public/draco/',
  '/src/renderer/public/draco/',

  // Specific gltf folder paths
  `${config.basePath}${config.dracoPath}gltf/`,
  './draco/gltf/',
  '/draco/gltf/',

  // CDN as last resort
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
];

/**
 * Asset validation - checks if all resources are available
 */
export async function validateAssets(modelIds: string[]): Promise<{valid: boolean, missing: string[]}> {
  const missing: string[] = [];
  
  for (const id of modelIds) {
    const modelPath = `${config.basePath}${config.modelsPath}/${id}.glb`;
    try {
      const response = await fetch(modelPath, { method: 'HEAD' });
      if (!response.ok) {
        missing.push(id);
      }
    } catch (error) {
      missing.push(id);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Initialize the asset manager
 */
export async function initAssetManager(): Promise<void> {
  assetLogger.highlight('Initializing asset manager...', 'info');

  // First, verify Draco decoder paths
  assetLogger.assetInfo('Testing Draco decoder paths');

  // Try each path to find working Draco decoder
  let dracoPathValid = false;
  for (const dracoUrl of dracoDecoderUrls) {
    try {
      const response = await fetch(`${dracoUrl}draco_decoder.js`, { method: 'HEAD' });
      if (response.ok) {
        dracoLoader.setDecoderPath(dracoUrl);
        dracoPathValid = true;
        assetLogger.assetInfo(`Found working Draco decoder at: ${dracoUrl}`);
        // Store in window to make it accessible to other loaders
        (window as any).dracoDecoderPath = dracoUrl;
        break;
      }
    } catch (error) {
      assetLogger.pathFailure(dracoUrl);
    }
  }

  if (!dracoPathValid) {
    // Try CDN as a last resort
    const fallbackDracoPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
    assetLogger.assetWarn(`No local Draco decoders found, using CDN fallback: ${fallbackDracoPath}`);
    dracoLoader.setDecoderPath(fallbackDracoPath);
    (window as any).dracoDecoderPath = fallbackDracoPath;
  }

  // Configure the loaders
  gltfLoader.setDRACOLoader(dracoLoader);

  // Test multiple model paths and use the first working one
  assetLogger.assetInfo('Testing model paths with standard test models');
  const testModels = ['Brain1', 'BrainstemNerves', 'midbrain'];

  let foundWorkingPath = false;
  for (const testModel of testModels) {
    assetLogger.resetPathLogging(); // Reset success flag for each model
    const modelTest = await testModelPath(testModel);
    if (modelTest.success && modelTest.found) {
      assetLogger.assetInfo(`Found working model path using ${testModel}: ${modelTest.found}`);

      // Update the config with the correct paths based on the first working model
      const urlObj = new URL(modelTest.found, window.location.origin);
      const pathParts = urlObj.pathname.split('/');
      const modelIndex = pathParts.findIndex(part => part === 'models');

      if (modelIndex > 0) {
        // Update configs to use the working path pattern
        config.basePath = pathParts.slice(0, modelIndex - 1).join('/') + '/';
        config.modelsPath = pathParts.slice(modelIndex - 1, modelIndex + 1).join('/');

        // For nested paths (low-poly or high-poly subfolders)
        if (pathParts[modelIndex + 1] === 'low-poly' || pathParts[modelIndex + 1] === 'high-poly') {
          config.modelsPath = pathParts.slice(modelIndex - 1, modelIndex + 2).join('/');
        }

        assetLogger.assetInfo(`Updated config paths: basePath="${config.basePath}", modelsPath="${config.modelsPath}"`);
        foundWorkingPath = true;
        break;
      }
    }
  }

  if (!foundWorkingPath) {
    assetLogger.assetError('No working model paths found! Models will not load correctly.');
    // Use fallback paths as a last resort
    assetLogger.assetWarn('Using fallback paths as last resort');
    config.basePath = '/';
    config.modelsPath = 'assets/models';
  }

  // Make config globally available
  (window as any).assetConfig = config;

  assetLogger.highlight('Asset manager initialized successfully', 'success');
  assetLogger.assetDebug('Final config:', config);
  return Promise.resolve();
}

/**
 * Load a GLTF model with proper error handling
 */
export async function loadModel(id: string): Promise<THREE.Group> {
  // Check the cache first
  if (modelCache.has(id)) {
    assetLogger.modelInfo(`Using cached model: ${id}`);
    return modelCache.get(id)!.clone();
  }

  // Test which path works and use it
  const pathTest = await testModelPath(id);

  if (!pathTest.success || !pathTest.found) {
    assetLogger.modelError(`Failed to find working path for model: ${id}`);
    return createFallbackModel(id);
  }

  const modelPath = pathTest.found;
  assetLogger.modelInfo(`Loading model from verified path: ${modelPath}`);

  try {
    // Use any to avoid type issues with GLTF
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.load(
        modelPath,
        resolve,
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            if (percent % 25 < 1) { // Log at 0%, 25%, 50%, 75%, 100%
              assetLogger.modelDebug(`Loading model ${id}: ${Math.floor(percent)}%`);
            }
          }
        },
        reject
      );
    });

    // Process the loaded model
    const model = gltf.scene;
    model.name = id;
    model.userData.id = id;

    // Apply standard material settings
    model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
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

    // Store in cache
    modelCache.set(id, model.clone());
    assetLogger.modelInfo(`Successfully loaded and cached model: ${id}`);

    return model;
  } catch (error) {
    assetLogger.modelError(`Error loading model ${id}:`, error);
    return createFallbackModel(id);
  }
}

/**
 * Creates a simple indicator as a fallback when models fail to load
 */
function createFallbackModel(id: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `Fallback for ${id}`;

  // Create a simple colored cube as fallback
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: '#ff4444',
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

  // Log that we're using a fallback model
  assetLogger.modelWarn(`Using fallback model for ${id} - Original model could not be loaded`);

  return group;
}

/**
 * Clear the model cache
 */
export function clearCache(): void {
  modelCache.clear();
}

/**
 * Get info about the current cache
 */
export function getCacheInfo(): { size: number, keys: string[] } {
  return {
    size: modelCache.size,
    keys: Array.from(modelCache.keys())
  };
}

/**
 * Tests if a model is accessible through various path patterns
 */
export async function testModelPath(id: string): Promise<{success: boolean, paths: string[], found?: string}> {
  // Try multiple path formats to find which one works
  const modelName = `${id}.glb`;
  const paths = [
    // Direct paths relative to current location
    `./assets/models/${modelName}`,
    `../assets/models/${modelName}`,
    `../../assets/models/${modelName}`,

    // Absolute paths (from web root)
    `/assets/models/${modelName}`,
    `/public/assets/models/${modelName}`,
    `/src/renderer/public/assets/models/${modelName}`,

    // Fallback to nested directories
    `./assets/models/low-poly/${modelName}`,
    `./assets/models/high-poly/${modelName}`,
    `/assets/models/low-poly/${modelName}`,
    `/assets/models/high-poly/${modelName}`,

    // Try direct path from config (should be earlier in the list for priority)
    `${config.basePath}${config.modelsPath}/${modelName}`,

    // Other common variations
    `assets/models/${modelName}`,
    `public/assets/models/${modelName}`,

    // Vite-specific paths
    `/src/public/assets/models/${modelName}`,
  ];

  assetLogger.assetDebug(`Testing model accessibility for ${id}`);
  assetLogger.assetDebug(`Current config: basePath="${config.basePath}", modelsPath="${config.modelsPath}"`);

  const results: {path: string, status: string}[] = [];
  let foundPath: string | undefined;

  for (const path of paths) {
    try {
      assetLogger.pathAttempt(path);
      const response = await fetch(path, { method: 'HEAD' });

      if (response.ok) {
        assetLogger.pathSuccess(path);
        results.push({path, status: '✅ Found'});

        if (!foundPath) {
          foundPath = path;
        }
      } else {
        assetLogger.pathFailure(path, `HTTP ${response.status}`);
        results.push({path, status: `❌ HTTP ${response.status}`});
      }
    } catch (error) {
      assetLogger.pathFailure(path, 'Network Error');
      results.push({path, status: '❌ Network Error'});
    }
  }

  // Only log the table in verbose mode
  assetLogger.assetDebug('Path test results:', results);

  return {
    success: !!foundPath,
    paths,
    found: foundPath
  };
}