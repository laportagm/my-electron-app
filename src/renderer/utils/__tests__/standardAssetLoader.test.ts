import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadModel, loadTexture, loadData, AssetType, ResolutionStrategy } from '../standardAssetLoader';
import { assetPathResolver } from '../AssetPathResolver';
import * as THREE from 'three';

// Mock assetPathResolver
vi.mock('../AssetPathResolver', () => {
  return {
    assetPathResolver: {
      resolvePath: vi.fn(),
      clearCache: vi.fn(),
    },
    AssetType: {
      MODEL: 'model',
      TEXTURE: 'texture',
      DRACO: 'draco',
      AUDIO: 'audio',
      DATA: 'data'
    },
    ResolutionStrategy: {
      STANDARD: 'standard',
      AGGRESSIVE: 'aggressive',
      ELECTRON_FIRST: 'electron',
      WEB_FIRST: 'web',
      CACHE_ONLY: 'cache'
    }
  };
});

// Create your mock classes first before mocking three
class MockTexture {
  name = '';
  uuid = '00000000-0000-0000-0000-000000000000';
  image = null;
  mipmaps = [];
  mapping = 300; // UVMapping
  wrapS = 1001; // ClampToEdgeWrapping
  wrapT = 1001; // ClampToEdgeWrapping
  magFilter = 1006; // LinearFilter
  minFilter = 1008; // LinearMipmapLinearFilter
  anisotropy = 1;
  format = 1023; // RGBAFormat
  type = 1009; // UnsignedByteType
  offset = { x: 0, y: 0 };
  repeat = { x: 1, y: 1 };
  rotation = 0;
  center = { x: 0, y: 0 };
  matrixAutoUpdate = true;
  matrix = { elements: new Float32Array(9).fill(0) };
  generateMipmaps = true;
  premultiplyAlpha = false;
  flipY = true;
  unpackAlignment = 4;
  encoding = 3000; // sRGBEncoding
  userData = {};
  version = 0;
  needsUpdate = false;
  dispose = vi.fn();
  clone = vi.fn().mockReturnThis();
  copy = vi.fn().mockReturnThis();
  toJSON = vi.fn();
  transformUv = vi.fn();
  updateMatrix = vi.fn();
  isTexture = true;
}

// Mock Three.js properly using importOriginal
vi.mock('three', async (importOriginal) => {
  // Import the actual Three.js module
  const actualThree = await importOriginal();

  // Create mock TextureLoader class
  const TextureLoader = vi.fn().mockImplementation(() => ({
    load: vi.fn().mockImplementation((url, onLoad, onProgress, onError) => {
      const mockTexture = new MockTexture();
      mockTexture.name = url.split('/').pop()?.split('.')[0] || '';

      // Call the onLoad callback if provided
      if (onLoad) {
        onLoad(mockTexture);
      }

      return mockTexture;
    }),
    // Add renderer capabilities needed for tests
    renderer: {
      capabilities: {
        getMaxAnisotropy: vi.fn().mockReturnValue(8)
      }
    }
  }));

  // Create mock AudioLoader class
  const AudioLoader = vi.fn().mockImplementation(() => ({
    load: vi.fn().mockImplementation((url, onLoad, onProgress, onError) => {
      // Simulate successful audio load
      if (onLoad) {
        onLoad({} as AudioBuffer);
      }
      return {} as AudioBuffer;
    })
  }));

  // Return an enhanced version of THREE with our custom mocks
  return {
    ...actualThree,
    TextureLoader,
    AudioLoader,
    Texture: vi.fn().mockImplementation(() => new MockTexture()),
    Group: vi.fn().mockImplementation(() => ({
      name: '',
      type: 'Group',
      children: [],
      add: vi.fn().mockImplementation(function(obj) {
        this.children.push(obj);
        return this;
      }),
      clone: vi.fn().mockReturnThis(),
      traverse: vi.fn().mockImplementation(function(callback) {
        callback(this);
        this.children.forEach(child => {
          if (child.traverse) child.traverse(callback);
        });
      }),
      userData: { isFallback: true },
      isGroup: true
    }))
  };
});

// Mock useAppStore
vi.mock('@/store/useAppStore', () => {
  return {
    useAppStore: {
      getState: vi.fn().mockReturnValue({
        setLoading: vi.fn(),
        addToCache: vi.fn(),
        cache: {}
      })
    }
  };
});

// Mock GLTFLoader and DRACOLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  return {
    GLTFLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockImplementation((url, onLoad) => {
        // Simulate successful load with mock scene
        onLoad({
          scene: new THREE.Group()
        });
      }),
      setDRACOLoader: vi.fn()
    }))
  };
});

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => {
  return {
    DRACOLoader: vi.fn().mockImplementation(() => ({
      setDecoderPath: vi.fn()
    }))
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('standardAssetLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock assetPathResolver.resolvePath to return a valid path by default
    (assetPathResolver.resolvePath as any).mockImplementation((type, id) => {
      if (type === AssetType.MODEL) {
        return Promise.resolve(`/assets/models/${id}.glb`);
      } else if (type === AssetType.TEXTURE) {
        return Promise.resolve(`/assets/textures/${id}.png`);
      } else if (type === AssetType.DATA) {
        return Promise.resolve(`/assets/data/${id}.json`);
      }
      return Promise.resolve(`/${type}/${id}`);
    });
    
    // Mock fetch responses for data loading
    (global.fetch as any).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ testData: 'success' })
      });
    });
  });
  
  afterEach(() => {
    // Clean up after each test
  });
  
  describe('loadModel', () => {
    it('should load a model successfully', async () => {
      // Mock path resolution
      (assetPathResolver.resolvePath as any).mockResolvedValue('/assets/models/test-model.glb');
      
      // Load the model
      const model = await loadModel({
        id: 'test-model'
      });
      
      // Verify path resolution was called with correct parameters
      expect(assetPathResolver.resolvePath).toHaveBeenCalledWith(
        AssetType.MODEL,
        'test-model',
        expect.objectContaining({ extension: '.glb' }),
        ResolutionStrategy.STANDARD
      );
      
      // Verify model was returned - check isGroup instead of instanceof
      expect(model.isGroup).toBe(true);
      expect(model.userData.id).toBe('test-model');
    });
    
    it('should handle loading errors and return fallback model', async () => {
      // Mock path resolution failure
      (assetPathResolver.resolvePath as any).mockResolvedValue('');

      // Load the model (should get fallback)
      const model = await loadModel({
        id: 'missing-model'
      });

      // Verify path resolution was attempted
      expect(assetPathResolver.resolvePath).toHaveBeenCalled();

      // Verify a fallback model was returned
      // We don't use toBeInstanceOf since we're not using actual THREE.Group
      expect(model.isGroup).toBe(true);
      // Check if model or any of its children has isFallback=true
      let hasFallback = false;
      model.traverse((obj) => {
        if (obj.userData && obj.userData.isFallback === true) {
          hasFallback = true;
        }
      });
      expect(hasFallback).toBe(true);
    });
    
    it('should respect variant option', async () => {
      // Load a model with variant specified
      await loadModel({
        id: 'variant-model',
        variant: 'high-poly'
      });
      
      // Verify path resolution with variant
      expect(assetPathResolver.resolvePath).toHaveBeenCalledWith(
        AssetType.MODEL,
        'variant-model',
        expect.objectContaining({ 
          extension: '.glb',
          variant: 'high-poly'
        }),
        expect.any(String)
      );
    });
    
    it('should respect resolution strategy', async () => {
      // Load a model with aggressive strategy
      await loadModel({
        id: 'strategy-model',
        strategy: ResolutionStrategy.AGGRESSIVE
      });
      
      // Verify path resolution with strategy
      expect(assetPathResolver.resolvePath).toHaveBeenCalledWith(
        AssetType.MODEL,
        'strategy-model',
        expect.anything(),
        ResolutionStrategy.AGGRESSIVE
      );
    });
  });
  
  describe('loadTexture', () => {
    // We no longer need a separate mock since it's defined in the vi.mock('three') block

    it('should load a texture successfully', async () => {
      // Mock path resolution
      (assetPathResolver.resolvePath as any).mockResolvedValue('/assets/textures/test-texture.png');

      // Load the texture
      const texture = await loadTexture({
        id: 'test-texture'
      });

      // Verify path resolution
      expect(assetPathResolver.resolvePath).toHaveBeenCalledWith(
        AssetType.TEXTURE,
        'test-texture',
        expect.objectContaining({ extension: '.png' }),
        expect.any(String)
      );

      // Verify texture was returned - check the isTexture property instead
      expect(texture.isTexture).toBe(true);
      expect(texture.name).toBe('test-texture');
    });

    it('should apply texture settings like anisotropy', async () => {
      // Our mock already sets maxAnisotropy to 8
      const mockMaxAnisotropy = 8;

      // Load texture with anisotropy
      const texture = await loadTexture({
        id: 'anisotropic-texture',
        anisotropy: 16 // Higher than max
      });

      // Should be clamped to max
      expect(texture.anisotropy).toBe(mockMaxAnisotropy);
    });
  });
  
  describe('loadData', () => {
    it('should load JSON data successfully', async () => {
      // Mock path resolution
      (assetPathResolver.resolvePath as any).mockResolvedValue('/assets/data/test-data.json');
      
      // Load the data
      const data = await loadData('test-data');
      
      // Verify path resolution
      expect(assetPathResolver.resolvePath).toHaveBeenCalledWith(
        AssetType.DATA,
        'test-data',
        expect.objectContaining({ extension: '.json' }),
        expect.any(String)
      );
      
      // Verify fetch was called with the resolved path
      expect(global.fetch).toHaveBeenCalledWith('/assets/data/test-data.json');
      
      // Verify data was returned
      expect(data).toEqual({ testData: 'success' });
    });
    
    it('should handle data loading errors', async () => {
      // Mock path resolution
      (assetPathResolver.resolvePath as any).mockResolvedValue('/assets/data/missing-data.json');

      // Mock fetch to fail
      (global.fetch as any).mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });
      });

      // Loading should throw an error
      await expect(loadData('missing-data')).rejects.toThrow(/HTTP error 404/);
    });
  });
});