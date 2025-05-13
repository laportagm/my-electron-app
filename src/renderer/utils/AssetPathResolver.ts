/**
 * AssetPathResolver.ts
 *
 * A comprehensive solution for standardizing asset paths across all environments
 * (development, production, Electron, browser, etc.)
 */
import electron from '../electron';
import { assetLogger } from './assetLogger';
import pathUtils from './pathUtils';

// Environment detection
const ENV = {
  isElectron: typeof window !== 'undefined' &&
    (window.electron !== undefined ||
     navigator.userAgent.toLowerCase().indexOf('electron') > -1),
  isDevelopment: process.env.NODE_ENV !== 'production',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.NODE_ENV === 'production'
};

// Asset types for specialized handling
export enum AssetType {
  MODEL = 'model',      // 3D models (GLB/GLTF)
  TEXTURE = 'texture',  // Textures (PNG/JPG)
  DRACO = 'draco',      // Draco decoders
  AUDIO = 'audio',      // Audio files
  DATA = 'data'         // JSON/data files
}

// Resolution strategies - allows for customizing path generation
export enum ResolutionStrategy {
  STANDARD = 'standard',       // Use standard resolution rules
  AGGRESSIVE = 'aggressive',   // Try many variations to find the asset
  ELECTRON_FIRST = 'electron', // Prioritize Electron-specific paths
  WEB_FIRST = 'web',           // Prioritize web-friendly paths
  CACHE_ONLY = 'cache'         // Only check cache, don't try to load assets
}

// Cache entry with metadata
interface CacheEntry {
  path: string;
  timestamp: number;
  strategy: ResolutionStrategy;
}

/**
 * AssetPathResolver provides a standardized way to resolve asset paths
 * across different environments (development, production, Electron, web)
 */
class AssetPathResolver {
  // Singleton instance
  private static instance: AssetPathResolver;

  // Cache of successfully resolved paths
  private pathCache: Map<string, CacheEntry> = new Map();

  // Base directories for different asset types (configurable)
  private baseDirs: Record<AssetType, string> = {
    [AssetType.MODEL]: 'assets/models',
    [AssetType.TEXTURE]: 'assets/textures',
    [AssetType.DRACO]: 'draco',
    [AssetType.AUDIO]: 'assets/audio',
    [AssetType.DATA]: 'assets/data'
  };

  /**
   * Normalize a path to ensure consistent format
   * Converts relative paths (./path) to absolute paths (/path)
   */
  private normalizePath(path: string): string {
    // Convert relative paths starting with ./ to paths starting with /
    if (path.startsWith('./')) {
      return path.substring(1); // Remove the dot but keep the slash
    }
    return path;
  }

  // Singleton constructor
  private constructor() {
    // Initialize and recover any cached paths from localStorage
    this.initializeFromStorage();
    assetLogger.assetInfo('AssetPathResolver initialized');
    assetLogger.assetDebug('Environment:', ENV);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AssetPathResolver {
    if (!AssetPathResolver.instance) {
      AssetPathResolver.instance = new AssetPathResolver();
    }
    return AssetPathResolver.instance;
  }

  /**
   * Initialize from localStorage if available
   */
  private initializeFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cachedPaths = window.localStorage.getItem('assetPathCache');
        if (cachedPaths) {
          const parsed = JSON.parse(cachedPaths);

          // Convert back to Map and normalize paths
          Object.keys(parsed).forEach(key => {
            const entry = parsed[key];
            // Normalize path format for consistency
            entry.path = this.normalizePath(entry.path);
            this.pathCache.set(key, entry);
          });

          assetLogger.assetInfo(`Restored ${this.pathCache.size} cached asset paths from storage`);
          assetLogger.assetDebug('Restored cache entries:',
            Object.fromEntries([...this.pathCache.entries()].map(([k, v]) => [k, v.path])));
        }
      } catch (error) {
        assetLogger.assetWarn('Failed to restore cached paths from localStorage:', error);
      }
    }
  }

  /**
   * Save current cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        // Convert Map to plain object for storage
        const cacheObj: Record<string, CacheEntry> = {};
        this.pathCache.forEach((value, key) => {
          cacheObj[key] = value;
        });
        
        window.localStorage.setItem('assetPathCache', JSON.stringify(cacheObj));
      } catch (error) {
        assetLogger.assetWarn('Failed to save cached paths to localStorage:', error);
      }
    }
  }

  /**
   * Configure base directories for asset types
   */
  public setBaseDir(type: AssetType, dir: string): void {
    this.baseDirs[type] = dir;
    assetLogger.assetInfo(`Set base directory for ${type} to: ${dir}`);
  }

  /**
   * Get base directory for a given asset type
   */
  public getBaseDir(type: AssetType): string {
    return this.baseDirs[type];
  }

  /**
   * Clear the entire path cache or entries for a specific type
   */
  public clearCache(type?: AssetType): void {
    if (type) {
      // Delete only entries for the specified type
      const keysToDelete: string[] = [];
      this.pathCache.forEach((_, key) => {
        if (key.startsWith(`${type}:`)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.pathCache.delete(key));
      assetLogger.assetInfo(`Cleared ${keysToDelete.length} cached paths for ${type}`);
    } else {
      // Clear the entire cache
      this.pathCache.clear();
      assetLogger.assetInfo('Cleared entire asset path cache');
    }
    
    // Update storage
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { total: number, byType: Record<string, number> } {
    const stats = {
      total: this.pathCache.size,
      byType: {} as Record<string, number>
    };
    
    this.pathCache.forEach((_, key) => {
      const type = key.split(':')[0];
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Create cache key for an asset
   */
  private createCacheKey(type: AssetType, id: string, variant?: string): string {
    return variant ? `${type}:${id}:${variant}` : `${type}:${id}`;
  }

  /**
   * Resolve a path for an asset using the specified strategy
   *
   * If path is already in cache, return it immediately
   * Otherwise, generate paths to try based on strategy and environment
   *
   * @param type Asset type (model, texture, etc.)
   * @param id Asset identifier (filename without extension)
   * @param options Additional options (extension, variant, etc.)
   * @param strategy Resolution strategy to use
   * @returns Resolved path (or empty string if not resolvable)
   */
  public async resolvePath(
    type: AssetType,
    id: string,
    options: {
      extension?: string,
      variant?: string,  // e.g., 'high-poly', 'low-poly', etc.
      forceRefresh?: boolean,
      skipCache?: boolean
    } = {},
    strategy: ResolutionStrategy = ResolutionStrategy.STANDARD
  ): Promise<string> {
    // Default extension based on type if not provided
    const extension = options.extension || this.getDefaultExtension(type);
    const variant = options.variant || '';
    const skipCache = options.skipCache || false;
    const forceRefresh = options.forceRefresh || false;

    // Create a cache key for this asset
    const cacheKey = this.createCacheKey(type, id, variant);

    // Check cache first (unless skipCache is true or forceRefresh is true)
    if (!skipCache && !forceRefresh && this.pathCache.has(cacheKey)) {
      const cachedEntry = this.pathCache.get(cacheKey);
      if (cachedEntry) {
        assetLogger.assetDebug(`Using cached path for ${cacheKey}: ${cachedEntry.path}`);
        // Ensure we don't return an undefined path
        if (cachedEntry.path) {
          // Return the cached path directly without validation
          return cachedEntry.path;
        }
      }
      // If we get here, the cache entry exists but has no valid path
      assetLogger.assetWarn(`Invalid cache entry for ${cacheKey}, proceeding with path resolution`);
    }

    // Special case: If using CACHE_ONLY strategy and no cache entry was found,
    // return empty string without making network requests
    if (strategy === ResolutionStrategy.CACHE_ONLY && (!this.pathCache.has(cacheKey) || !this.pathCache.get(cacheKey)?.path)) {
      assetLogger.assetDebug(`No cache entry found for ${cacheKey} with CACHE_ONLY strategy`);
      return '';
    }

    // Generate paths based on strategy and environment
    const pathsToTry = await this.generatePaths(type, id, extension, variant, strategy);

    // Log paths for debugging
    assetLogger.assetDebug(`Trying ${pathsToTry.length} paths for ${cacheKey}`);
    assetLogger.assetDebug('Paths to try:', pathsToTry);

    // If CACHE_ONLY strategy, don't try network requests
    if (strategy === ResolutionStrategy.CACHE_ONLY) {
      return '';
    }

    // Try each path
    for (const path of pathsToTry) {
      try {
        assetLogger.pathAttempt(path);

        // Use HEAD request to check if the file exists
        const response = await fetch(path, { method: 'HEAD' });

        if (response.ok) {
          assetLogger.pathSuccess(path);

          // Normalize the path for consistency
          const normalizedPath = this.normalizePath(path);

          // Cache the successful path
          this.pathCache.set(cacheKey, {
            path: normalizedPath,
            timestamp: Date.now(),
            strategy
          });

          // Save to localStorage
          this.saveToStorage();

          return normalizedPath;
        } else {
          assetLogger.pathFailure(path, `HTTP ${response.status}`);
        }
      } catch (error) {
        assetLogger.pathFailure(path, 'Network Error');
      }
    }

    // If we get here, no paths worked
    assetLogger.assetError(`Failed to resolve path for ${cacheKey}`);
    return '';
  }

  /**
   * Generate potential paths to try based on strategy and environment
   */
  private async generatePaths(
    type: AssetType,
    id: string,
    extension: string,
    variant: string,
    strategy: ResolutionStrategy
  ): Promise<string[]> {
    const filename = `${id}${extension}`;
    const baseDir = this.baseDirs[type];
    const isElectron = ENV.isElectron;
    const isDev = ENV.isDevelopment;
    
    // Base paths that work in many environments
    let paths: string[] = [];
    
    // Special case for Draco decoder path (needed for proper GLTF loading)
    if (type === AssetType.DRACO) {
      return this.generateDracoPaths(id, extension);
    }
    
    // Add variant to the base path if provided
    const variantPath = variant ? `${baseDir}/${variant}` : baseDir;
    
    // Standard paths that work in both web and Electron
    const standardPaths = [
      // Relative paths from current location (often works in dev)
      `./${variantPath}/${filename}`,
      `../${variantPath}/${filename}`,
      `${variantPath}/${filename}`,
      
      // Absolute paths from web root (often works in production)
      `/${variantPath}/${filename}`,
      `/public/${variantPath}/${filename}`,
    ];
    
    // Electron-specific paths using electron.path.join if available
    const electronPaths = isElectron && window.electron?.path ? [
      // Paths via Electron API if available
      window.electron.path.join(process.cwd(), variantPath, filename),
      window.electron.path.join(process.resourcesPath || '', variantPath, filename),
      window.electron.path.join('public', variantPath, filename),
    ].filter(Boolean) : [];
    
    // Development-specific paths
    const devPaths = isDev ? [
      `/src/renderer/public/${variantPath}/${filename}`,
      `/src/renderer/${variantPath}/${filename}`,
      `/src/public/${variantPath}/${filename}`,
      `/src/${variantPath}/${filename}`,
    ] : [];
    
    // Production-specific paths
    const prodPaths = !isDev ? [
      `/resources/app.asar/${variantPath}/${filename}`,
      `/resources/app/${variantPath}/${filename}`,
    ] : [];
    
    // Build the final list of paths based on strategy
    switch (strategy) {
      case ResolutionStrategy.ELECTRON_FIRST:
        paths = [...electronPaths, ...standardPaths, ...devPaths, ...prodPaths];
        break;

      case ResolutionStrategy.WEB_FIRST:
        paths = [...standardPaths, ...electronPaths, ...devPaths, ...prodPaths];
        break;

      case ResolutionStrategy.AGGRESSIVE:
        // Generate even more paths with alternative base directories
        const aggressivePaths = [
          // Try project root
          `/${filename}`,
          `./${filename}`,
          // Try different nesting levels
          `/assets/${filename}`,
          `./assets/${filename}`,
          `../assets/${filename}`,
          `/resources/${filename}`,
          `/app/${variantPath}/${filename}`,
          `/static/${variantPath}/${filename}`,
        ];

        // Add all other paths as well for maximum coverage
        paths = [...standardPaths, ...electronPaths, ...devPaths, ...prodPaths, ...aggressivePaths];
        break;

      case ResolutionStrategy.CACHE_ONLY:
        // Don't try any paths for CACHE_ONLY as we'll only use cached entries
        assetLogger.assetDebug('Using CACHE_ONLY strategy, no paths will be tried');
        return [];

      case ResolutionStrategy.STANDARD:
      default:
        // Standard strategy prioritizes reliable paths
        paths = [...standardPaths, ...devPaths, ...prodPaths, ...electronPaths];
        break;
    }
    
    // Filter out empty paths and duplicates
    return [...new Set(paths.filter(Boolean))];
  }

  /**
   * Special case for Draco decoder paths
   */
  private generateDracoPaths(id: string, extension: string): string[] {
    const baseDir = this.baseDirs[AssetType.DRACO];
    const filename = `${id}${extension}`;
    
    // Standard Draco paths
    return [
      // Local relative paths
      `./${baseDir}/${filename}`,
      `./${baseDir}/gltf/${filename}`,
      `../${baseDir}/${filename}`,
      `../../${baseDir}/${filename}`,
      
      // Absolute paths
      `/${baseDir}/${filename}`,
      `/${baseDir}/gltf/${filename}`,
      `/public/${baseDir}/${filename}`,
      `/src/renderer/public/${baseDir}/${filename}`,
      
      // CDN as last resort
      `https://www.gstatic.com/draco/versioned/decoders/1.5.6/${filename}`
    ];
  }

  /**
   * Get default extension for a given asset type
   */
  private getDefaultExtension(type: AssetType): string {
    switch (type) {
      case AssetType.MODEL:
        return '.glb';
      case AssetType.TEXTURE:
        return '.png';
      case AssetType.DRACO:
        return '.js';
      case AssetType.AUDIO:
        return '.mp3';
      case AssetType.DATA:
        return '.json';
      default:
        return '';
    }
  }

  /**
   * Check if an asset exists at any of the possible paths
   */
  public async checkAssetExists(
    type: AssetType,
    id: string,
    options: { extension?: string; variant?: string } = {}
  ): Promise<boolean> {
    const path = await this.resolvePath(type, id, options);
    return !!path;
  }

  /**
   * Get asset URL with proper query parameters for cache busting
   */
  public getAssetUrl(
    type: AssetType,
    id: string,
    options: { extension?: string; variant?: string; cacheBuster?: boolean } = {}
  ): string {
    // First check if we have this path in cache
    const extension = options.extension || this.getDefaultExtension(type);
    const variant = options.variant || '';
    const cacheKey = this.createCacheKey(type, id, variant);
    
    // Return cached path if available
    const cachedEntry = this.pathCache.get(cacheKey);
    if (cachedEntry) {
      const url = this.normalizePath(cachedEntry.path);

      // Add cache buster if requested
      if (options.cacheBuster) {
        return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      }

      return url;
    }
    
    // If not in cache, construct a likely path
    const baseDir = this.baseDirs[type];
    const variantPath = variant ? `${baseDir}/${variant}` : baseDir;
    const filename = `${id}${extension}`;
    
    // Use the most reliable path format
    const url = ENV.isElectron && window.electron?.path
      ? window.electron.path.join(variantPath, filename) // Use electron.path directly for better reliability
      : pathUtils.join(variantPath, filename); // Fallback to pathUtils if electron.path is unavailable
      
    // Add cache buster if requested
    if (options.cacheBuster) {
      return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
    
    return url;
  }
}

// Export the singleton instance
export const assetPathResolver = AssetPathResolver.getInstance();

// Export the class for testing
export default AssetPathResolver;