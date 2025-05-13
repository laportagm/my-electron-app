import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DracoDecoderManager, { dracoDecoderManager, DecoderType } from '../DracoDecoderManager';
import { assetPathResolver } from '../AssetPathResolver';

// Mock DRACOLoader
vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => {
  return {
    DRACOLoader: vi.fn().mockImplementation(() => ({
      setDecoderPath: vi.fn(),
      setDecoderConfig: vi.fn(),
      decoderPath: '/mocked/draco/path/'
    }))
  };
});

// Mock asset path resolver
vi.mock('../AssetPathResolver', () => {
  return {
    assetPathResolver: {
      resolvePath: vi.fn(),
      setBaseDir: vi.fn()
    },
    AssetType: {
      DRACO: 'draco'
    },
    ResolutionStrategy: {
      AGGRESSIVE: 'aggressive'
    }
  };
});

// Mock fetch
global.fetch = vi.fn();

// Mock WebAssembly if not available
if (typeof WebAssembly === 'undefined') {
  (global as any).WebAssembly = {
    Module: vi.fn(),
    Instance: vi.fn()
  };
}

// Mock console methods to suppress output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('DracoDecoderManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset fetch mocks - successful fetch by default
    (global.fetch as any).mockResolvedValue({
      ok: true
    });
    
    // Mock successful path resolution
    (assetPathResolver.resolvePath as any).mockResolvedValue('/draco/gltf/draco_decoder.js');
  });
  
  describe('initialization', () => {
    it('should initialize with default options', async () => {
      // Make the WebAssembly tests work
      vi.spyOn(WebAssembly, 'Module').mockImplementation((binary) => {
        return {} as WebAssembly.Module;
      });
      
      vi.spyOn(WebAssembly, 'Instance').mockImplementation((module) => {
        return {} as WebAssembly.Instance;
      });
      
      // Call init
      await dracoDecoderManager.init();
      
      // Verify decoder path was set
      expect(dracoDecoderManager.getDecoderPath()).toBe('/mocked/draco/path/');
      
      // Should attempt to resolve the path
      expect(assetPathResolver.resolvePath).toHaveBeenCalled();
    });
    
    it('should use JS decoder if WebAssembly is not supported', async () => {
      // Make WebAssembly test fail
      vi.spyOn(WebAssembly, 'Module').mockImplementation(() => {
        throw new Error('WebAssembly not supported');
      });
      
      // Call init
      await dracoDecoderManager.init();
      
      // Should fall back to JS decoder
      expect(dracoDecoderManager.getDecoderType()).toBe(DecoderType.JS);
    });
    
    it('should use CDN fallback if path resolution fails', async () => {
      // Make path resolution fail
      (assetPathResolver.resolvePath as any).mockResolvedValue('');
      
      // Call init
      await dracoDecoderManager.init();
      
      // Should use CDN fallback
      expect(dracoDecoderManager.getDecoderPath()).toBe('/mocked/draco/path/');
    });
  });
  
  describe('file verification', () => {
    it('should verify decoder files', async () => {
      // Mock successful fetches
      (global.fetch as any).mockResolvedValue({
        ok: true
      });
      
      // Call init
      await dracoDecoderManager.init({
        type: DecoderType.JS // Use JS to simplify test
      });
      
      // Get verification info
      const info = dracoDecoderManager.getVerificationInfo();
      
      // Should be initialized
      expect(info.initialized).toBe(true);
      
      // Should have JS decoder type
      expect(info.decoderType).toBe(DecoderType.JS);
    });
    
    it('should handle verification failures', async () => {
      // Mock failed fetch for verification
      (global.fetch as any).mockResolvedValue({
        ok: false
      });
      
      // Successful path resolution
      (assetPathResolver.resolvePath as any).mockResolvedValue('/draco/draco_decoder.js');
      
      // Call init
      await dracoDecoderManager.init({
        type: DecoderType.JS // Use JS to simplify test
      });
      
      // Get verification info
      const info = dracoDecoderManager.getVerificationInfo();
      
      // Should still be initialized (with fallback)
      expect(info.initialized).toBe(true);
      
      // Should have JS decoder type
      expect(info.decoderType).toBe(DecoderType.JS);
    });
  });
  
  describe('preloading', () => {
    it('should preload decoder files', async () => {
      // Mock successful init
      await dracoDecoderManager.init({
        type: DecoderType.JS // Use JS to simplify test
      });
      
      // Reset fetch mock to track calls
      (global.fetch as any).mockClear();
      
      // Preload files
      await dracoDecoderManager.preloadDecoderFiles();
      
      // Should call fetch for the JS decoder
      expect(global.fetch).toHaveBeenCalled();
    });
    
    it('should handle preload failures gracefully', async () => {
      // Mock successful init
      await dracoDecoderManager.init({
        type: DecoderType.JS // Use JS to simplify test
      });
      
      // Make fetch fail
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      // Preload should not throw
      await expect(dracoDecoderManager.preloadDecoderFiles()).resolves.not.toThrow();
    });
  });
  
  describe('DRACOLoader access', () => {
    it('should return the DRACOLoader instance', async () => {
      // Init first
      await dracoDecoderManager.init();
      
      // Get the loader
      const loader = dracoDecoderManager.getDracoLoader();
      
      // Should have setDecoderPath method
      expect(loader.setDecoderPath).toBeDefined();
    });
    
    it('should auto-initialize if getDracoLoader called before init', () => {
      // Get without init
      const loader = dracoDecoderManager.getDracoLoader();
      
      // Should still return a loader
      expect(loader.setDecoderPath).toBeDefined();
    });
  });
});