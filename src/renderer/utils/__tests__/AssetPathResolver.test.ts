import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AssetPathResolver, { assetPathResolver, AssetType, ResolutionStrategy } from '../AssetPathResolver';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AssetPathResolver', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Mock successful fetch by default
    (global.fetch as any).mockResolvedValue({
      ok: true
    });
  });
  
  afterEach(() => {
    // Clear any path cache between tests to ensure isolation
    assetPathResolver.clearCache();
  });
  
  describe('resolvePath', () => {
    it('should successfully resolve a path with standard strategy', async () => {
      // Setup a successful fetch for one specific path
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/assets/models/test-model.glb') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      const path = await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'test-model',
        { extension: '.glb' },
        ResolutionStrategy.STANDARD
      );
      
      expect(path).toBe('/assets/models/test-model.glb');
      expect(global.fetch).toHaveBeenCalled();
    });
    
    it('should use cache for subsequent requests', async () => {
      // First request will check paths
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/assets/models/cached-model.glb') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      // First request - should trigger fetch
      const firstPath = await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'cached-model',
        { extension: '.glb' }
      );
      
      // Reset fetch mock to verify it's not called again
      (global.fetch as any).mockClear();
      
      // Second request - should use cache
      const secondPath = await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'cached-model',
        { extension: '.glb' }
      );
      
      expect(firstPath).toBe('/assets/models/cached-model.glb');
      expect(secondPath).toBe('/assets/models/cached-model.glb');
      expect(global.fetch).not.toHaveBeenCalled(); // Not called for the second request
    });
    
    it('should bypass cache when forceRefresh is true', async () => {
      // Setup a successful fetch
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/assets/models/refresh-model.glb') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      // First request
      await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'refresh-model',
        { extension: '.glb' }
      );
      
      // Reset fetch mock to verify it's called again
      (global.fetch as any).mockClear();
      
      // Second request with forceRefresh
      await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'refresh-model',
        { extension: '.glb', forceRefresh: true }
      );
      
      expect(global.fetch).toHaveBeenCalled(); // Called again for the second request
    });
    
    it('should handle failed resolution and return empty string', async () => {
      // Mock all fetch calls to fail
      (global.fetch as any).mockImplementation(() => {
        return Promise.resolve({ ok: false });
      });
      
      const path = await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'missing-model',
        { extension: '.glb' }
      );
      
      expect(path).toBe('');
      expect(global.fetch).toHaveBeenCalled();
    });
    
    it('should try Draco-specific paths for DRACO asset type', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/draco/gltf/draco_decoder.js') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      const path = await assetPathResolver.resolvePath(
        AssetType.DRACO,
        'draco_decoder',
        { extension: '.js' }
      );
      
      expect(path).toBe('/draco/gltf/draco_decoder.js');
    });
    
    it('should handle variant paths correctly', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/assets/models/high-poly/variant-model.glb') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      const path = await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'variant-model',
        { extension: '.glb', variant: 'high-poly' }
      );
      
      expect(path).toBe('/assets/models/high-poly/variant-model.glb');
    });
  });
  
  describe('configuration and cache', () => {
    it('should allow setting custom base directories', async () => {
      // Set a custom base directory for models
      assetPathResolver.setBaseDir(AssetType.MODEL, 'custom/models/dir');
      
      // Mock a successful fetch for the custom path
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('custom/models/dir')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      // Should use the custom base directory
      await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'custom-model',
        { extension: '.glb' }
      );
      
      // Verify a path with the custom directory was tried
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('custom/models/dir'),
        expect.anything()
      );
      
      // Reset to default for other tests
      assetPathResolver.setBaseDir(AssetType.MODEL, 'assets/models');
    });
    
    it('should clear type-specific cache entries', async () => {
      // Setup cache entries for different types
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('.glb') || url.includes('.png')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });
      
      // Cache a model
      await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'model-to-clear',
        { extension: '.glb' }
      );
      
      // Cache a texture
      await assetPathResolver.resolvePath(
        AssetType.TEXTURE,
        'texture-to-keep',
        { extension: '.png' }
      );
      
      // Clear only model cache
      assetPathResolver.clearCache(AssetType.MODEL);
      
      // Reset fetch mock to check which paths are re-fetched
      (global.fetch as any).mockClear();
      
      // This should trigger fetch again (cache cleared)
      await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'model-to-clear',
        { extension: '.glb' }
      );
      
      // This should use cache (not cleared)
      await assetPathResolver.resolvePath(
        AssetType.TEXTURE,
        'texture-to-keep',
        { extension: '.png' }
      );
      
      // Fetch should be called only once for the model that was cleared
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Check that the call was for the model
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('model-to-clear.glb'),
        expect.anything()
      );
    });
    
    it('should get cache statistics', async () => {
      // Clear any existing cache
      assetPathResolver.clearCache();
      
      // Setup cache entries
      (global.fetch as any).mockResolvedValue({ ok: true });
      
      // Cache several different assets
      await assetPathResolver.resolvePath(AssetType.MODEL, 'model1');
      await assetPathResolver.resolvePath(AssetType.MODEL, 'model2');
      await assetPathResolver.resolvePath(AssetType.TEXTURE, 'texture1');
      
      // Get cache stats
      const stats = assetPathResolver.getCacheStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byType.model).toBe(2);
      expect(stats.byType.texture).toBe(1);
    });
  });
  
  describe('localStorage integration', () => {
    it('should persist cache to localStorage', async () => {
      // Mock localStorage
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      
      // Set up a successful path resolution
      (global.fetch as any).mockResolvedValue({ ok: true });
      
      // Resolve a path (should save to localStorage)
      await assetPathResolver.resolvePath(
        AssetType.MODEL,
        'localStorage-model',
        { extension: '.glb' }
      );
      
      // Verify localStorage was updated
      expect(setItemSpy).toHaveBeenCalled();
      expect(setItemSpy).toHaveBeenCalledWith(
        'assetPathCache',
        expect.stringContaining('localStorage-model')
      );
    });
    
    it('should restore cache from localStorage on initialization', async () => {
      // Clear the pathCache before the test to ensure a clean state
      assetPathResolver.clearCache();

      // Prepare mock data for localStorage - must match path format used internally
      const mockCacheData = {
        'model:restored-model': {
          path: '/assets/models/restored-model.glb',
          timestamp: Date.now(),
          strategy: ResolutionStrategy.STANDARD
        }
      };

      // Set mock data in localStorage
      localStorageMock.setItem('assetPathCache', JSON.stringify(mockCacheData));

      // Force the singleton instance to reload from localStorage
      // This is a hack for testing purposes to simulate a fresh load
      // @ts-ignore - Accessing private static property for testing
      AssetPathResolver.instance = null;

      // Create a new instance which should load from localStorage
      const instance = AssetPathResolver.getInstance();

      // Reset fetch mock to verify it's not called
      (global.fetch as any).mockClear();

      // Get a path that should be in the restored cache
      const path = await instance.resolvePath(
        AssetType.MODEL,
        'restored-model',
        { extension: '.glb' }
      );

      // Should get the path without fetching
      expect(path).toBe('/assets/models/restored-model.glb');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});