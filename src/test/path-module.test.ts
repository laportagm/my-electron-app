/**
 * Path Module Test
 * 
 * Tests path module availability and functionality in both main and renderer processes.
 * This verifies that path functions are working correctly and accessible in different environments,
 * particularly important after fixes for path module issues.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as nodePath from 'path';

describe('Path Module Availability & Functionality', () => {
  // Store original environment
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProcessType = (process as any).type;
  
  // Test in main process context
  describe('Main Process Environment', () => {
    beforeEach(() => {
      // Set up main process environment
      process.env.NODE_ENV = 'test';
      (process as any).type = undefined; // Main process has undefined type
      vi.resetModules();
    });
    
    afterEach(() => {
      // Restore original environment
      process.env.NODE_ENV = originalNodeEnv;
      (process as any).type = originalProcessType;
      vi.restoreAllMocks();
    });
    
    it('should have direct access to Node.js path module', () => {
      // Verify path module is directly accessible
      expect(nodePath).toBeDefined();
      expect(nodePath.join).toBeDefined();
      expect(nodePath.resolve).toBeDefined();
      expect(typeof nodePath.join).toBe('function');
      expect(typeof nodePath.resolve).toBe('function');
      
      // Test basic functionality
      expect(nodePath.join('a', 'b')).toBe('a/b');
      expect(nodePath.resolve('/a', 'b')).toContain('/a/b');
    });
    
    it('should properly load path module in config', async () => {
      // Dynamically import config to test its path handling
      const { config } = await import('../utils/config');
      
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
      expect(typeof config.modelStoragePath).toBe('string');
    });
    
    it('should handle path operations when required directly', () => {
      // Test require.resolve which uses path internally
      try {
        // This will fail if path is not accessible
        const resolvedPath = require.resolve('path');
        expect(resolvedPath).toBeDefined();
        expect(resolvedPath).toContain('path');
      } catch (error) {
        // If this fails, it's likely that Node.js modules aren't properly accessible
        expect(error).toBeUndefined();
      }
    });
  });
  
  // Test in renderer process context
  describe('Renderer Process Environment', () => {
    beforeEach(() => {
      // Set up renderer process environment
      process.env.NODE_ENV = 'test';
      (process as any).type = 'renderer';
      
      // Mock window.electron for renderer process tests
      global.window = {
        ...global.window,
        electron: {
          path: {
            join: (...args: string[]) => nodePath.join(...args),
            resolve: (...args: string[]) => nodePath.resolve(...args),
            dirname: (p: string) => nodePath.dirname(p),
            basename: (p: string) => nodePath.basename(p),
            extname: (p: string) => nodePath.extname(p),
            sep: nodePath.sep
          },
          getPath: (name: string) => {
            switch (name) {
              case 'userData':
                return '/mock/user/data';
              case 'documents':
                return '/mock/documents';
              default:
                return '/mock/path';
            }
          }
        }
      } as any;
      
      vi.resetModules();
    });
    
    afterEach(() => {
      // Restore original environment
      process.env.NODE_ENV = originalNodeEnv;
      (process as any).type = originalProcessType;
      delete (global.window as any).electron;
      vi.restoreAllMocks();
    });
    
    it('should have path module available via window.electron', () => {
      expect((window as any).electron.path).toBeDefined();
      expect((window as any).electron.path.join).toBeDefined();
      expect((window as any).electron.path.resolve).toBeDefined();
      expect(typeof (window as any).electron.path.join).toBe('function');
      
      // Test basic functionality of exposed path functions
      const joinResult = (window as any).electron.path.join('a', 'b');
      expect(joinResult).toBe('a/b');
      
      const resolveResult = (window as any).electron.path.resolve('/a', 'b');
      expect(resolveResult).toContain('/a/b');
    });
    
    it('should properly use window.electron.path in config', async () => {
      // Track calls to window.electron.path.join
      const joinSpy = vi.spyOn((window as any).electron.path, 'join');
      
      // Import config to test path handling in renderer
      const { config } = await import('../utils/config');
      
      // Verify config was loaded
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
      
      // In renderer, electron.path.join should have been called for model path
      expect(joinSpy).toHaveBeenCalled();
    });
    
    it('should fallback gracefully if electron.path becomes unavailable', async () => {
      // Remove path from window.electron to test fallback behavior
      delete (window as any).electron.path;
      
      // Import config to test fallback behavior
      const { config } = await import('../utils/config');
      
      // Should still define config with fallback paths
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
      expect(typeof config.modelStoragePath).toBe('string');
    });
  });
  
  // Test with incomplete or broken environment
  describe('Broken or Partial Environment', () => {
    beforeEach(() => {
      // Reset modules
      vi.resetModules();
    });
    
    afterEach(() => {
      // Restore original environment
      process.env.NODE_ENV = originalNodeEnv;
      (process as any).type = originalProcessType;
      vi.restoreAllMocks();
    });
    
    it('should handle missing window.electron gracefully', async () => {
      // Set renderer environment but no window.electron
      (process as any).type = 'renderer';
      global.window = {} as any;
      
      // This should use fallback path implementation
      const { config } = await import('../utils/config');
      
      // Should still define config even without window.electron
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
    });
    
    it('should handle completely broken path module with fallbacks', async () => {
      // Break path module access
      vi.mock('path', () => {
        // Return an empty object to simulate completely broken path module
        return {};
      });
      
      // Import config which should use fallbacks
      const { config } = await import('../utils/config');
      
      // Config should be defined using fallback paths
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
    });
  });
});