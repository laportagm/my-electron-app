/**
 * Path Resolution Test
 * 
 * Tests path handling functionality across the application
 * to ensure paths are resolved correctly in both main and renderer processes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';

describe('Path Resolution', () => {
  // Test direct path module usage
  describe('Node.js path module', () => {
    it('should correctly resolve paths', () => {
      const testPath = path.resolve('/test', 'path', 'to', 'file.txt');
      expect(testPath).toContain('/test/path/to/file.txt');
    });

    it('should correctly join paths', () => {
      const joined = path.join('test', 'path', 'file.txt');
      expect(joined).toBe('test/path/file.txt');
    });

    it('should handle dirname correctly', () => {
      const dir = path.dirname('/test/path/file.txt');
      expect(dir).toBe('/test/path');
    });

    it('should handle basename correctly', () => {
      const base = path.basename('/test/path/file.txt');
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
    beforeEach(() => {
      // Mock window.electron for renderer tests
      global.window = {
        ...global.window,
        electron: {
          path: {
            join: (...args: string[]) => path.join(...args),
            resolve: (...args: string[]) => path.resolve(...args),
            dirname: (p: string) => path.dirname(p),
            basename: (p: string) => path.basename(p),
            extname: (p: string) => path.extname(p)
          },
          getPath: (name: string) => {
            switch (name) {
              case 'userData':
                return path.join(os.tmpdir(), 'test-userData');
              case 'documents':
                return path.join(os.homedir(), 'Documents');
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