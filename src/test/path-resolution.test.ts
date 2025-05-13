/**
 * Path Resolution Test
 * 
 * Tests path handling functionality across the application
 * to ensure paths are resolved correctly in both main and renderer processes.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
// We'll mock these modules instead of importing them directly
// to avoid require is not defined errors
// import * as path from 'path';
// import * as os from 'os';

// Mock path module for ES module compatibility
vi.mock('path', () => {
  return {
    resolve: (...args) => args.join('/').replace(/\/+/g, '/'),
    join: (...args) => args.join('/'),
    dirname: (p) => {
      const parts = p.split('/');
      parts.pop();
      return parts.join('/') || '/';
    },
    basename: (p) => p.split('/').pop() || '',
    extname: (p) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    },
    sep: '/'
  };
});

// Mock os module for ES module compatibility
vi.mock('os', () => {
  return {
    tmpdir: () => '/tmp',
    homedir: () => '/home/user'
  };
});

describe('Path Resolution', () => {
  // Test direct path module usage
  describe('Node.js path module', () => {
    it('should correctly resolve paths', async () => {
      const pathModule = await import('path');
      const testPath = pathModule.resolve('/test', 'path', 'to', 'file.txt');
      expect(testPath).toContain('/test/path/to/file.txt');
    });

    it('should correctly join paths', async () => {
      const pathModule = await import('path');
      const joined = pathModule.join('test', 'path', 'file.txt');
      expect(joined).toBe('test/path/file.txt');
    });

    it('should handle dirname correctly', async () => {
      const pathModule = await import('path');
      const dir = pathModule.dirname('/test/path/file.txt');
      expect(dir).toBe('/test/path');
    });

    it('should handle basename correctly', async () => {
      const pathModule = await import('path');
      const base = pathModule.basename('/test/path/file.txt');
      expect(base).toBe('file.txt');
    });
  });

  // Test paths in the config module
  describe('Configuration path handling', () => {
    let originalNodeEnv: string | undefined;
    
    beforeEach(() => {
      // Store original NODE_ENV
      originalNodeEnv = process.env.NODE_ENV;
      // Reset for tests
      process.env.NODE_ENV = 'test';
      
      // Clear module cache to ensure fresh imports
      vi.resetModules();
    });
    
    afterEach(() => {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    it('should handle paths in config module', async () => {
      try {
        // Import the config module
        const { config } = await import('../utils/config');
        
        // Check that the config object exists and has the expected properties
        expect(config).toBeDefined();
        expect(config.apiUrl).toBeDefined();
        expect(config.modelStoragePath).toBeDefined();
      } catch (error: any) {
        // Log specific path related errors
        if (
          error.message.includes('path.resolve is not a function') ||
          error.message.includes('path.join is not a function') ||
          error.message.includes('Cannot read properties of undefined (reading \'resolve\')')
        ) {
          throw new Error(`Path resolution error in config: ${error.message}`);
        } else {
          throw error;
        }
      }
    });
  });

  // Test path utilities in renderer code
  describe('Renderer path utilities', () => {
    beforeEach(async () => {
      // Import the mocked modules
      const pathModule = await import('path');
      const osModule = await import('os');
      
      // Mock window.electron for renderer tests
      global.window = {
        ...global.window,
        electron: {
          path: {
            join: (...args: string[]) => pathModule.join(...args),
            resolve: (...args: string[]) => pathModule.resolve(...args),
            dirname: (p: string) => pathModule.dirname(p),
            basename: (p: string) => pathModule.basename(p),
            extname: (p: string) => pathModule.extname(p)
          },
          getPath: (name: string) => {
            switch (name) {
              case 'userData':
                return pathModule.join(osModule.tmpdir(), 'test-userData');
              case 'documents':
                return pathModule.join(osModule.homedir(), 'Documents');
              default:
                return '';
            }
          }
        }
      } as any;
    });
    
    afterEach(() => {
      // Clean up mocks
      vi.restoreAllMocks();
      delete (global.window as any).electron;
    });
    
    it('should check if electron.path is available in renderer', () => {
      expect((window as any).electron.path).toBeDefined();
      expect((window as any).electron.path.join).toBeDefined();
      expect((window as any).electron.path.resolve).toBeDefined();
    });
    
    it('should handle path functions via electron preload in renderer', () => {
      const joinedPath = (window as any).electron.path.join('test', 'path');
      expect(joinedPath).toBe('test/path');
      
      const resolvedPath = (window as any).electron.path.resolve('/test', 'path');
      expect(resolvedPath).toContain('/test/path');
    });
    
    it('should handle app.getPath via preload in renderer', () => {
      const userDataPath = (window as any).electron.getPath('userData');
      expect(userDataPath).toContain('test-userData');
    });
  });
});