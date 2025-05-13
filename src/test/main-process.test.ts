/**
 * Main Process Test
 * 
 * This file tests the main process configuration and initialization
 * without actually launching Electron.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

// Mock the electron modules
vi.mock('electron', () => {
  const mockApp = {
    whenReady: vi.fn().mockResolvedValue({}),
    on: vi.fn(),
    getPath: vi.fn().mockReturnValue('/mock/path'),
  };
  
  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      on: vi.fn(),
    },
  }));
  
  const mockIpcMain = {
    on: vi.fn(),
    handle: vi.fn(),
  };
  
  const mockSession = {
    defaultSession: {
      webRequest: {
        onBeforeRequest: vi.fn(),
      },
    },
  };
  
  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    session: mockSession,
  };
});

// Test helper to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('Main Process', () => {
  // Ensure required files exist
  it('should have main.dev.cjs file available', async () => {
    const mainDevPath = path.join(__dirname, '../main/main.dev.cjs');
    expect(await fileExists(mainDevPath)).toBe(true);
  });
  
  it('should have preload.js file available', async () => {
    const preloadPath = path.join(__dirname, '../main/preload.js');
    expect(await fileExists(preloadPath)).toBe(true);
  });
  
  // Test config.ts for path resolution
  it('should properly import and use path in config.ts', async () => {
    // Dynamic import to ensure we're using the actual module
    try {
      const { config } = await import('../utils/config');
      expect(config).toBeDefined();
      expect(config.apiUrl).toBeDefined();
    } catch (error: any) {
      // Test for the specific "require is not defined" error we're trying to fix
      if (error.message.includes('require is not defined')) {
        throw new Error('Config is still using require() in ESM context: ' + error.message);
      } else if (error.message.includes('path.resolve is not a function')) {
        throw new Error('Path resolution error: ' + error.message);
      } else {
        throw error;
      }
    }
  });
  
  // Test if the main process can be loaded without errors
  it('should be able to load main.dev.cjs without syntax errors', async () => {
    const mainDevPath = path.join(__dirname, '../main/main.dev.cjs');
    
    // In ESM, we can't directly require a CJS file, but we can check it loads without syntax errors
    try {
      const mainContent = await fs.promises.readFile(mainDevPath, 'utf-8');
      expect(mainContent).toContain('const { app, BrowserWindow');
      
      // Simple syntax check
      new Function(mainContent);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error(`Syntax error in main.dev.cjs: ${error.message}`);
      } else {
        throw error;
      }
    }
  });
  
  // Ensure the main process reads the environment correctly
  it('should use the correct port from environment variables', async () => {
    const mainDevPath = path.join(__dirname, '../main/main.dev.cjs');
    const mainContent = await fs.promises.readFile(mainDevPath, 'utf-8');
    
    // Check the port configuration
    expect(mainContent).toContain('VITE_DEV_SERVER_URL || \'http://localhost:5173\'');
  });
});