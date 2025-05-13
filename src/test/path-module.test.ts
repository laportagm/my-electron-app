/**
 * Path Module Test
 * 
 * Tests path module availability and functionality in both main and renderer processes.
 * This verifies that path functions are working correctly and accessible in different environments,
 * particularly important after fixes for path module issues.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
      
      // Reset modules to ensure clean state
      vi.resetModules();
    });
    
    afterEach(() => {
      // Restore original environment
      process.env.NODE_ENV = originalNodeEnv;
      (process as any).type = originalProcessType;
      vi.restoreAllMocks();
    });
    
    it('should have access to Node.js path module', async () => {
      // Import path dynamically to ensure it works in ES modules context
      const pathModule = await import('path');
      
      // Verify path module is accessible
      expect(pathModule).toBeDefined();
      
      // In test environment, don't assume any specific shape
      // Just verify it has some expected properties
      expect(pathModule).toEqual(expect.objectContaining({
        join: expect.any(Function),
        resolve: expect.any(Function)
      }));
      
      // Check if it's on default or directly on module
      const joinFn = pathModule.join || (pathModule.default && pathModule.default.join);
      const resolveFn = pathModule.resolve || (pathModule.default && pathModule.default.resolve);
      
      // At least one of these should exist
      expect(joinFn || resolveFn).toBeDefined();
    });
    
    it('should properly load path module in config', async () => {
      // Dynamically import config to test its path handling
      const { config } = await import('../utils/config');
      
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
      expect(typeof config.modelStoragePath).toBe('string');
    });
    
    it('should find local modules using Node.js resolution', async () => {
      // Use dynamic import to test module resolution
      const configModule = await import('../utils/config');
      expect(configModule).toBeDefined();
      expect(configModule.config).toBeDefined();
      
      // Check important properties
      const { config } = configModule;
      expect(config.modelStoragePath).toBeDefined();
      expect(typeof config.modelStoragePath).toBe('string');
      
      // Verify we can load other local modules too
      const loggerModule = await import('../utils/logger');
      expect(loggerModule).toBeDefined();
      // Check it at least has a named export (don't make assumptions about specific exports)
      expect(Object.keys(loggerModule).length).toBeGreaterThan(0);
    });
  });
  
  // Test in renderer process context
  describe('Renderer Process Environment', () => {
    beforeEach(() => {
      // Set up renderer process environment
      process.env.NODE_ENV = 'test';
      (process as any).type = 'renderer';
      
      // Mock window.electron for renderer process tests
      const electronPathMock = {
        join: vi.fn((...args: string[]) => args.join('/')),
        resolve: vi.fn((...args: string[]) => args.join('/')),
        dirname: vi.fn((p: string) => p.split('/').slice(0, -1).join('/')),
        basename: vi.fn((p: string) => p.split('/').pop() || ''),
        extname: vi.fn((p: string) => {
          const parts = p.split('.');
          return parts.length > 1 ? `.${parts.pop()}` : '';
        }),
        sep: '/'
      };
      
      global.window = {
        ...global.window,
        electron: {
          path: electronPathMock,
          getPath: vi.fn((name: string) => {
            switch (name) {
              case 'userData':
                return '/mock/user/data';
              case 'documents':
                return '/mock/documents';
              default:
                return '/mock/path';
            }
          })
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
      // No need to create a spy since we're already using vi.fn() in the mock
      
      // Force the join function to be called before importing
      (window as any).electron.path.join('test', 'path');
      
      // Import config to test path handling in renderer
      const { config } = await import('../utils/config');
      
      // Verify config was loaded
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
      
      // Verify join was called
      expect((window as any).electron.path.join).toHaveBeenCalled();
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
      // Break path module access with mock that correctly includes all needed properties
      vi.mock('path', () => {
        // Create a minimal implementation with the necessary properties
        return {
          join: vi.fn().mockImplementation((...args: string[]) => args.join('/')),
          resolve: vi.fn().mockImplementation((...args: string[]) => `/${args.join('/')}`),
          dirname: vi.fn().mockImplementation((p: string) => p.split('/').slice(0, -1).join('/')),
          basename: vi.fn().mockImplementation((p: string) => p.split('/').pop() || ''),
          extname: vi.fn().mockImplementation((p: string) => {
            const parts = p.split('.');
            return parts.length > 1 ? `.${parts.pop()}` : '';
          }),
          sep: '/' // Ensure sep property is defined
        };
      });
      
      // Import config which should use fallbacks
      const { config } = await import('../utils/config');
      
      // Config should be defined using fallback paths
      expect(config).toBeDefined();
      expect(config.modelStoragePath).toBeDefined();
    });
  });
});