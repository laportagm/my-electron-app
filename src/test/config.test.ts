/**
 * Config Module Test
 * 
 * Tests the configuration module to ensure it works correctly
 * in both main and renderer processes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as nodePath from 'path';

describe('Config Module', () => {
  // Save original environment variables
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiUrl = process.env.API_URL;
  
  // Test variables
  const testApiUrl = 'http://localhost:5173';
  
  beforeEach(() => {
    // Reset environment for each test
    process.env.NODE_ENV = 'test';
    process.env.API_URL = testApiUrl;
    
    // Clear module cache for fresh imports
    vi.resetModules();
    
    // Mock a window object for renderer tests
    if (typeof window === 'undefined') {
      global.window = {
        localStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
        },
        electron: {
          getPath: vi.fn().mockResolvedValue('/mock/user/data'),
          path: {
            join: (...args: string[]) => nodePath.join(...args),
            resolve: (...args: string[]) => nodePath.resolve(...args),
          }
        }
      } as any;
    }
  });
  
  afterEach(() => {
    // Restore original environment after each test
    process.env.NODE_ENV = originalNodeEnv;
    process.env.API_URL = originalApiUrl;
    
    // Clean up mocks
    vi.restoreAllMocks();
    
    // Clean up window mock if needed
    if (typeof global.window !== 'undefined' && 
        !(global.window as any).isRealWindow) {
      delete global.window;
    }
  });

  // Test basic config loading
  it('should load config with values from environment variables', async () => {
    // Import config dynamically for isolation between tests
    const { config } = await import('../utils/config.fixed.ts');
    
    expect(config).toBeDefined();
    expect(config.apiUrl).toBe(testApiUrl);
    expect(config.debugMode).toBe(false);
  });
  
  // Test path resolution in the config module
  it('should correctly resolve paths', async () => {
    const { config } = await import('../utils/config.fixed.ts');

    // The model storage path should be defined
    expect(config.modelStoragePath).toBeDefined();
    
    // If window.electron.getPath is defined, it should use that
    if (typeof window !== 'undefined' && 
        (window as any).electron && 
        (window as any).electron.getPath) {
      expect(config.modelStoragePath).toContain('models');
    }
  });
  
  // Test renderer config functions
  it('should provide renderer config functions', async () => {
    const { rendererConfig } = await import('../utils/config.fixed.ts');
    
    expect(rendererConfig.getTheme).toBeDefined();
    expect(rendererConfig.setTheme).toBeDefined();
    expect(rendererConfig.getLoggingLevel).toBeDefined();
    expect(rendererConfig.setLoggingLevel).toBeDefined();
  });
  
  // Test localStorage usage in renderer
  it('should use localStorage in renderer process', async () => {
    // Mock localStorage.getItem to return a theme
    if (typeof window !== 'undefined' && window.localStorage) {
      (window.localStorage.getItem as any).mockReturnValue('"dark"');
    }
    
    const { rendererConfig } = await import('../utils/config.fixed.ts');
    
    // Get theme and verify localStorage was used
    const theme = rendererConfig.getTheme();
    
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem).toHaveBeenCalledWith('config_theme');
      expect(theme).toBe('dark');
    }
  });
  
  // Test setting values
  it('should store values correctly', async () => {
    const { rendererConfig } = await import('../utils/config.fixed.ts');
    
    // Set a theme
    rendererConfig.setTheme('dark');
    
    // Verify localStorage.setItem was called with the right values
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'config_theme', 
        '"dark"'
      );
    }
  });
  
  // Test logging level functions
  it('should manage logging levels correctly', async () => {
    // Mock localStorage for logging levels
    if (typeof window !== 'undefined' && window.localStorage) {
      const mockLoggingLevels = {
        assets: 'verbose',
        models: 'quiet'
      };
      (window.localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'config_loggingLevels') {
          return JSON.stringify(mockLoggingLevels);
        }
        return null;
      });
    }
    
    const { rendererConfig } = await import('../utils/config.fixed.ts');
    
    // Test getting logging levels
    expect(rendererConfig.getLoggingLevel('assets')).toBe('verbose');
    expect(rendererConfig.getLoggingLevel('models')).toBe('quiet');
    
    // Test setting a logging level
    rendererConfig.setLoggingLevel('assets', 'normal');
    
    // Verify localStorage.setItem was called with the updated values
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.setItem).toHaveBeenCalled();
      // The last call should have been to update loggingLevels
      const lastCall = (window.localStorage.setItem as any).mock.calls.slice(-1)[0];
      expect(lastCall[0]).toBe('config_loggingLevels');
      
      // Parse the stored value to check if it contains the updated level
      const storedValue = JSON.parse(lastCall[1]);
      expect(storedValue.assets).toBe('normal');
      expect(storedValue.models).toBe('quiet');
    }
  });
});