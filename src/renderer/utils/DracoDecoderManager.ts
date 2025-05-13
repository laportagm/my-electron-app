/**
 * DracoDecoderManager.ts
 * 
 * A comprehensive solution for managing Draco decoders with robust fallback mechanisms
 * and enhanced support across all environments (development, production, Electron, browser).
 */
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { assetLogger } from './assetLogger';
import { assetPathResolver, AssetType, ResolutionStrategy } from './AssetPathResolver';

// Environment detection
const ENV = {
  isElectron: typeof window !== 'undefined' &&
    (window.electron !== undefined ||
     navigator.userAgent.toLowerCase().indexOf('electron') > -1),
  isDevelopment: process.env.NODE_ENV !== 'production',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.NODE_ENV === 'production'
};

// Decoder file naming constants
const DECODER_FILES = {
  WASM_DECODER: 'draco_decoder.wasm',
  JS_DECODER: 'draco_decoder.js',
  WASM_WRAPPER: 'draco_wasm_wrapper.js',
};

// CDN fallback URL - known reliable source
const CDN_FALLBACK_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

// Decoder type enum
export enum DecoderType {
  WASM = 'wasm',  // WebAssembly (preferred)
  JS = 'js'       // JavaScript
}

// Decoder configuration options
export interface DecoderOptions {
  type?: DecoderType;
  basePath?: string;
  useGltfVariant?: boolean;
  skipCache?: boolean;
  forceRefresh?: boolean;
}

/**
 * DracoDecoderManager handles the loading and configuration of Draco decoders
 * with proper fallback mechanisms and environment detection.
 */
class DracoDecoderManager {
  // Singleton instance
  private static instance: DracoDecoderManager;
  
  // Global DRACOLoader instance (shared across the application)
  private dracoLoader: DRACOLoader;
  
  // Track if initialization has been completed
  private initialized: boolean = false;
  
  // Successfully verified decoder paths
  private verifiedPaths: Map<string, string> = new Map();
  
  // Decoder type (WASM or JS)
  private decoderType: DecoderType = DecoderType.WASM;
  
  // Use GLTF-specific decoder variant
  private useGltfVariant: boolean = true;
  
  // Private constructor for singleton pattern
  private constructor() {
    this.dracoLoader = new DRACOLoader();
    assetLogger.assetInfo('DracoDecoderManager created');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DracoDecoderManager {
    if (!DracoDecoderManager.instance) {
      DracoDecoderManager.instance = new DracoDecoderManager();
    }
    return DracoDecoderManager.instance;
  }
  
  /**
   * Get the global DRACOLoader instance
   * (ensure it's initialized first by calling init())
   */
  public getDracoLoader(): DRACOLoader {
    if (!this.initialized) {
      assetLogger.assetWarn('DracoDecoderManager not initialized. Call init() before using.');
      // Auto-initialize with default options as a fallback
      this.init();
    }
    return this.dracoLoader;
  }
  
  /**
   * Initialize the Draco decoder system
   */
  public async init(options: DecoderOptions = {}): Promise<boolean> {
    assetLogger.highlight('Initializing Draco decoder system...', 'info');
    
    // Set configuration from options
    this.decoderType = options.type || DecoderType.WASM;
    this.useGltfVariant = options.useGltfVariant !== false; // Default to true
    
    // Set base path if provided in options
    if (options.basePath) {
      assetPathResolver.setBaseDir(AssetType.DRACO, options.basePath);
    }
    
    try {
      // Check for WebAssembly support if using WASM decoder
      if (this.decoderType === DecoderType.WASM) {
        const hasWasm = this.checkWasmSupport();
        
        if (!hasWasm) {
          assetLogger.assetWarn('WebAssembly not supported. Falling back to JS decoder.');
          this.decoderType = DecoderType.JS;
        }
      }
      
      // Path resolution strategy - aggressive for decoders since they're critical
      const strategy = ResolutionStrategy.AGGRESSIVE;
      
      // Resolve the decoder path
      const mainFile = this.useGltfVariant
        ? `gltf/${DECODER_FILES.JS_DECODER}`
        : DECODER_FILES.JS_DECODER;
      
      // Try to find the decoder path
      const decoderPath = await assetPathResolver.resolvePath(
        AssetType.DRACO,
        mainFile,
        { 
          extension: '', 
          skipCache: options.skipCache,
          forceRefresh: options.forceRefresh
        },
        strategy
      );
      
      if (!decoderPath) {
        // If we can't find the main JS decoder file, return false
        assetLogger.assetError('Failed to resolve Draco decoder path.');
        this.setFallbackCdnPath();
        return false;
      }
      
      // Convert path to directory by removing filename
      const pathParts = decoderPath.split('/');
      pathParts.pop(); // Remove the filename
      const decoderDir = pathParts.join('/') + '/';
      
      // Set the decoder path
      assetLogger.assetInfo(`Setting Draco decoder path to: ${decoderDir}`);
      this.dracoLoader.setDecoderPath(decoderDir);
      
      // Configure the decoder type
      this.dracoLoader.setDecoderConfig({ type: this.decoderType });
      
      // Store the working path globally for other components
      (window as any).dracoDecoderPath = decoderDir;
      
      // Verify that all required files exist
      const verificationResult = await this.verifyDecoderFiles(decoderDir);
      
      if (!verificationResult) {
        assetLogger.assetWarn('Decoder files verification failed. Using CDN fallback.');
        this.setFallbackCdnPath();
        return false;
      }
      
      // Mark as initialized
      this.initialized = true;
      assetLogger.highlight('Draco decoder system initialized successfully!', 'success');
      return true;
    } catch (error) {
      assetLogger.assetError('Error initializing Draco decoder system:', error);
      this.setFallbackCdnPath();
      return false;
    }
  }
  
  /**
   * Check for WebAssembly support in the current environment
   */
  private checkWasmSupport(): boolean {
    try {
      // Check for WebAssembly object
      if (typeof WebAssembly !== 'object') {
        return false;
      }
      
      // Create a simple module to test instantiation
      const module = new WebAssembly.Module(new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // WASM_BINARY_MAGIC
        0x01, 0x00, 0x00, 0x00  // WASM_BINARY_VERSION
      ]));
      
      if (module instanceof WebAssembly.Module) {
        // Create an instance to test execution
        const instance = new WebAssembly.Instance(module);
        return (instance instanceof WebAssembly.Instance);
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Verify that all required decoder files exist in the given directory
   */
  private async verifyDecoderFiles(decoderDir: string): Promise<boolean> {
    const files = [DECODER_FILES.JS_DECODER];
    
    // Add WASM files if using WASM decoder
    if (this.decoderType === DecoderType.WASM) {
      files.push(DECODER_FILES.WASM_DECODER);
      files.push(DECODER_FILES.WASM_WRAPPER);
    }
    
    // Verify each file
    for (const file of files) {
      try {
        // Try to fetch the file
        const response = await fetch(`${decoderDir}${file}`, { method: 'HEAD' });
        
        if (!response.ok) {
          assetLogger.assetWarn(`Required decoder file not found: ${decoderDir}${file}`);
          return false;
        }
        
        // Store verified path
        this.verifiedPaths.set(file, `${decoderDir}${file}`);
      } catch (error) {
        assetLogger.assetWarn(`Error verifying decoder file: ${decoderDir}${file}`, error);
        return false;
      }
    }
    
    assetLogger.assetInfo('Successfully verified all required decoder files');
    return true;
  }
  
  /**
   * Set CDN fallback path for reliability
   */
  private setFallbackCdnPath(): void {
    assetLogger.assetWarn(`Using CDN fallback for Draco decoder: ${CDN_FALLBACK_URL}`);
    this.dracoLoader.setDecoderPath(CDN_FALLBACK_URL);
    
    // Store CDN path globally for other components
    (window as any).dracoDecoderPath = CDN_FALLBACK_URL;
    
    // Mark as initialized
    this.initialized = true;
  }
  
  /**
   * Preload decoder files to warm up the cache
   * This can improve performance for the first model load
   */
  public async preloadDecoderFiles(): Promise<void> {
    assetLogger.assetInfo('Preloading Draco decoder files...');
    
    // Skip if already initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Get the decoder path
    const decoderPath = this.dracoLoader.decoderPath;
    
    // Preload the JS decoder file
    try {
      await fetch(`${decoderPath}${DECODER_FILES.JS_DECODER}`);
      assetLogger.assetInfo(`Preloaded: ${DECODER_FILES.JS_DECODER}`);
      
      // Preload WASM files if using WASM decoder
      if (this.decoderType === DecoderType.WASM) {
        await Promise.all([
          fetch(`${decoderPath}${DECODER_FILES.WASM_DECODER}`),
          fetch(`${decoderPath}${DECODER_FILES.WASM_WRAPPER}`)
        ]);
        assetLogger.assetInfo(`Preloaded: ${DECODER_FILES.WASM_DECODER}, ${DECODER_FILES.WASM_WRAPPER}`);
      }
      
      assetLogger.assetInfo('Draco decoder files preloaded successfully');
    } catch (error) {
      assetLogger.assetWarn('Error preloading decoder files:', error);
    }
  }
  
  /**
   * Get the decoder type
   */
  public getDecoderType(): DecoderType {
    return this.decoderType;
  }
  
  /**
   * Get the decoder path
   */
  public getDecoderPath(): string {
    return this.dracoLoader.decoderPath;
  }
  
  /**
   * Get verification information for debugging
   */
  public getVerificationInfo(): { 
    initialized: boolean, 
    decoderType: DecoderType, 
    decoderPath: string,
    verifiedPaths: Map<string, string> 
  } {
    return {
      initialized: this.initialized,
      decoderType: this.decoderType,
      decoderPath: this.dracoLoader.decoderPath,
      verifiedPaths: this.verifiedPaths
    };
  }
}

// Export the singleton instance
export const dracoDecoderManager = DracoDecoderManager.getInstance();

// Export types and enums
export default DracoDecoderManager;