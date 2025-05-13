/**
 * StandardAssetLoader
 * 
 * A unified asset loading system that provides consistent behavior
 * across all environments (development, production, Electron, browser)
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';
import { assetLogger } from './assetLogger';
import { assetPathResolver, AssetType, ResolutionStrategy } from './AssetPathResolver';
import { useAppStore } from '@/store/useAppStore';

// Loaders cache to avoid recreating loaders
const loaders = {
  gltf: null as GLTFLoader | null,
  draco: null as DRACOLoader | null,
  texture: null as THREE.TextureLoader | null,
  audio: null as THREE.AudioLoader | null
};

// Options for model loading
export interface ModelLoadOptions {
  id: string;
  variant?: 'low-poly' | 'high-poly' | string; // Allow specific variant loading
  applyMaterials?: boolean; // Whether to apply standard materials
  useCache?: boolean; // Whether to use and update the cache
  onProgress?: (progress: number) => void; // Progress callback
  strategy?: ResolutionStrategy; // Path resolution strategy
}

// Options for texture loading
export interface TextureLoadOptions {
  id: string; 
  variant?: string;
  onProgress?: (progress: number) => void;
  anisotropy?: number;
  encoding?: THREE.TextureEncoding;
  strategy?: ResolutionStrategy;
}

// Initialize the loaders
function initLoaders(): void {
  // Initialize GLTF loader if needed
  if (!loaders.gltf) {
    loaders.gltf = new GLTFLoader();
  }

  // Initialize Draco loader if needed
  if (!loaders.draco) {
    loaders.draco = new DRACOLoader();
    
    // Try to find Draco decoder
    initDracoDecoder();
  }

  // Connect Draco loader to GLTF loader
  loaders.gltf.setDRACOLoader(loaders.draco);

  // Initialize texture loader if needed  
  if (!loaders.texture) {
    loaders.texture = new THREE.TextureLoader();
  }

  // Initialize audio loader if needed
  if (!loaders.audio) {
    loaders.audio = new THREE.AudioLoader();
  }

  assetLogger.assetInfo('Standard asset loaders initialized');
}

// Initialize Draco decoder using the asset path resolver
async function initDracoDecoder(): Promise<void> {
  const decoderPath = await assetPathResolver.resolvePath(
    AssetType.DRACO,
    'draco_decoder',
    { extension: '.js' },
    ResolutionStrategy.AGGRESSIVE
  );

  if (decoderPath) {
    // Extract the base directory from the resolved path
    const lastSlashIndex = decoderPath.lastIndexOf('/');
    const decoderDir = lastSlashIndex !== -1 
      ? decoderPath.substring(0, lastSlashIndex + 1) 
      : './draco/';

    assetLogger.assetInfo(`Setting Draco decoder path to: ${decoderDir}`);
    loaders.draco?.setDecoderPath(decoderDir);
    
    // Store the working path for other components that might need it
    (window as any).dracoDecoderPath = decoderDir;
  } else {
    // Fall back to CDN if we couldn't find a local path
    const cdnPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
    assetLogger.assetWarn(`Using CDN fallback for Draco decoder: ${cdnPath}`);
    loaders.draco?.setDecoderPath(cdnPath);
    (window as any).dracoDecoderPath = cdnPath;
  }
}

/**
 * Create a fallback model when loading fails
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

  // Mark this as a fallback model in userData
  group.userData = { 
    id, 
    isFallback: true,
    loadError: true
  };

  // Log that we're using a fallback model
  assetLogger.modelWarn(`Using fallback model for ${id} - Original model could not be loaded`);

  return group;
}

/**
 * Apply standard materials to a model for consistent appearance
 */
function applyStandardMaterials(model: THREE.Group): void {
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
}

/**
 * Load a 3D model using standardized path resolution
 */
export async function loadModel(options: ModelLoadOptions): Promise<THREE.Group> {
  const {
    id,
    variant = '',
    applyMaterials = true,
    useCache = true,
    onProgress,
    strategy = ResolutionStrategy.STANDARD
  } = options;

  // Start timing for performance measurement
  const startTime = performance.now();
  assetLogger.modelInfo(`Loading model: ${id}${variant ? ` (${variant})` : ''}`);

  // Initialize loaders if needed
  if (!loaders.gltf || !loaders.draco) {
    initLoaders();
  }

  // Check the cache first
  if (useCache) {
    const store = useAppStore.getState();
    if (store.cache[id]) {
      assetLogger.modelInfo(`Using cached model: ${id}`);
      // Return a clone to avoid modifying the cached version
      const clonedModel = store.cache[id].clone();
      return clonedModel;
    }
  }

  // Create a container for the model that we can return immediately
  const modelContainer = new THREE.Group();
  modelContainer.name = id;
  modelContainer.userData = { id, variant };

  // Set loading state
  useAppStore.getState().setLoading(true);

  try {
    // Resolve the model path using the asset path resolver
    const modelPath = await assetPathResolver.resolvePath(
      AssetType.MODEL,
      id,
      { extension: '.glb', variant },
      strategy
    );

    if (!modelPath) {
      throw new Error(`Could not resolve path for model: ${id}`);
    }

    assetLogger.modelInfo(`Loading model from path: ${modelPath}`);

    // Load the model
    const gltf = await new Promise<any>((resolve, reject) => {
      loaders.gltf!.load(
        modelPath,
        resolve,
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            if (onProgress) {
              onProgress(percent);
            }
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
    model.userData = { 
      ...model.userData,
      id, 
      variant,
      loadTime: performance.now() - startTime
    };

    // Apply standard materials if requested
    if (applyMaterials) {
      applyStandardMaterials(model);
    }

    // Add the model to the container
    modelContainer.add(model);

    // Store in cache if requested
    if (useCache) {
      useAppStore.getState().addToCache(id, modelContainer.clone());
    }

    // Log success and timing information
    const loadTime = (performance.now() - startTime) / 1000;
    assetLogger.modelInfo(`Model ${id} loaded successfully in ${loadTime.toFixed(1)}s`);

    // Update loading state
    useAppStore.getState().setLoading(false);

    return modelContainer;
  } catch (error) {
    // Log error
    assetLogger.modelError(`Error loading model ${id}:`, error);

    // Create and return a fallback model
    const fallbackModel = createFallbackModel(id);
    modelContainer.add(fallbackModel);

    // Update loading state
    useAppStore.getState().setLoading(false);

    return modelContainer;
  }
}

/**
 * Load a texture using standardized path resolution
 */
export async function loadTexture(options: TextureLoadOptions): Promise<THREE.Texture> {
  const {
    id,
    variant = '',
    onProgress,
    anisotropy,
    encoding,
    strategy = ResolutionStrategy.STANDARD
  } = options;

  // Initialize loaders if needed
  if (!loaders.texture) {
    initLoaders();
  }

  try {
    // Resolve the texture path using the asset path resolver
    const texturePath = await assetPathResolver.resolvePath(
      AssetType.TEXTURE,
      id,
      { extension: '.png', variant },
      strategy
    );

    if (!texturePath) {
      throw new Error(`Could not resolve path for texture: ${id}`);
    }

    assetLogger.assetInfo(`Loading texture from path: ${texturePath}`);

    // Load the texture
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      loaders.texture!.load(
        texturePath,
        resolve,
        (progress) => {
          if (onProgress && progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            onProgress(percent);
          }
        },
        reject
      );
    });

    // Configure texture properties
    if (anisotropy !== undefined && anisotropy > 0) {
      const maxAnisotropy = loaders.texture!.renderer?.capabilities.getMaxAnisotropy() || 1;
      texture.anisotropy = Math.min(anisotropy, maxAnisotropy);
    }

    if (encoding !== undefined) {
      texture.encoding = encoding;
    }

    // Set texture name for easier identification
    texture.name = id;

    return texture;
  } catch (error) {
    assetLogger.assetError(`Error loading texture ${id}:`, error);

    // Return a simple error texture
    const errorTexture = new THREE.Texture();
    errorTexture.name = `Error texture for ${id}`;
    
    return errorTexture;
  }
}

/**
 * Load a audio file using standardized path resolution
 */
export async function loadAudio(id: string, variant = '', onProgress?: (progress: number) => void): Promise<AudioBuffer> {
  // Initialize loaders if needed
  if (!loaders.audio) {
    initLoaders();
  }

  try {
    // Resolve the audio path using the asset path resolver
    const audioPath = await assetPathResolver.resolvePath(
      AssetType.AUDIO,
      id,
      { extension: '.mp3', variant },
      ResolutionStrategy.STANDARD
    );

    if (!audioPath) {
      throw new Error(`Could not resolve path for audio: ${id}`);
    }

    assetLogger.assetInfo(`Loading audio from path: ${audioPath}`);

    // Load the audio
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      loaders.audio!.load(
        audioPath,
        resolve,
        (progress) => {
          if (onProgress && progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            onProgress(percent);
          }
        },
        reject
      );
    });

    return audioBuffer;
  } catch (error) {
    assetLogger.assetError(`Error loading audio ${id}:`, error);
    throw error;
  }
}

/**
 * Load a JSON data file using standardized path resolution
 */
export async function loadData<T = any>(id: string, variant = ''): Promise<T> {
  try {
    // Resolve the data path using the asset path resolver
    const dataPath = await assetPathResolver.resolvePath(
      AssetType.DATA,
      id,
      { extension: '.json', variant },
      ResolutionStrategy.STANDARD
    );

    if (!dataPath) {
      throw new Error(`Could not resolve path for data: ${id}`);
    }

    assetLogger.assetInfo(`Loading data from path: ${dataPath}`);

    // Fetch the data
    const response = await fetch(dataPath);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data as T;
  } catch (error) {
    assetLogger.assetError(`Error loading data ${id}:`, error);
    throw error;
  }
}

// Export a function to configure asset base directories
export function configureAssetDirectories(config: Record<AssetType, string>): void {
  Object.keys(config).forEach(key => {
    const assetType = key as AssetType;
    assetPathResolver.setBaseDir(assetType, config[assetType]);
  });
  
  assetLogger.assetInfo('Asset directories configured:', config);
}

// Export the assetPathResolver for direct access
export { assetPathResolver };

// Export the asset types and resolution strategies
export { AssetType, ResolutionStrategy };

// Initialize loaders on module import
initLoaders();