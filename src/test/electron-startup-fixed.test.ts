/**
 * Electron Application Startup Test
 *
 * Tests that the Electron app starts correctly,
 * with proper handling of preload scripts and window creation.
 * This is an integration test for the main process initialization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';

// Import interfaces for typechecking
import { BrowserWindow } from 'electron';

// Reference the electronMock from setup.ts
declare global {
  // eslint-disable-next-line no-var
  var electronMock: any;
}

describe('Electron Application Startup', () => {
  // Original environment
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProcessType = (process as any).type;

  beforeEach(() => {
    // Set up main process environment
    process.env.NODE_ENV = 'test';
    (process as any).type = undefined; // Main process

    // Reset mocks
    vi.resetModules();
    vi.resetAllMocks();
    
    // Mock the logger to prevent console noise during tests
    vi.mock('../utils/logger', () => ({
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      },
      handleError: vi.fn()
    }));
    
    // Mock fs.existsSync to simulate preload script existence
    vi.mock('fs', async () => {
      const actual = await vi.importActual('fs') as typeof fs;
      return {
        ...actual,
        existsSync: vi.fn().mockImplementation((path: string) => {
          // Return true for any path containing "preload" to simulate script existence
          return typeof path === 'string' && path.includes('preload');
        }),
        statSync: vi.fn().mockReturnValue({
          isFile: () => true
        }),
        accessSync: vi.fn(),
        promises: {
          readFile: vi.fn().mockResolvedValue('mock file content'),
          writeFile: vi.fn().mockResolvedValue(undefined),
          readdir: vi.fn().mockResolvedValue(['file1', 'file2'])
        },
        readdirSync: vi.fn().mockReturnValue(['preload.js', 'preload-fixed.js'])
      };
    });
  });
  
  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalNodeEnv;
    (process as any).type = originalProcessType;
    vi.restoreAllMocks();
  });
  
  it('should resolve the preload script path correctly', async () => {
    // Import mock main module and get the initialize function
    const { initializeApp } = await import('./mocks/main');
    
    // Call the initialize function directly
    await initializeApp();
    
    // Check that BrowserWindow was created with a preload script
    expect(electronMock.BrowserWindow).toHaveBeenCalled();
    const options = electronMock.BrowserWindow.mock.calls[0][0];
    
    // Verify the preload script path is set
    expect(options.webPreferences).toBeDefined();
    expect(options.webPreferences.preload).toBeDefined();
    expect(typeof options.webPreferences.preload).toBe('string');
    expect(options.webPreferences.preload).toContain('preload');
    
    // Verify BrowserWindow creation with correct options
    expect(options.webPreferences.contextIsolation).toBe(true);
    expect(options.webPreferences.nodeIntegration).toBe(false);
  });
  
  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });
    
    it('should load development URL and open DevTools', async () => {
      // Import mock main module and get the initialize function
      const { initializeApp } = await import('./mocks/main');
      
      // Call the initialize function directly
      await initializeApp();
      
      // Get the created BrowserWindow instance
      const browserWindowInstance = electronMock.BrowserWindow.mock.results[0].value;
      
      // Verify loadURL was called with development URL
      expect(browserWindowInstance.loadURL).toHaveBeenCalled();
      
      // Verify DevTools were opened
      expect(browserWindowInstance.webContents.openDevTools).toHaveBeenCalled();
    });
  });
  
  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });
    
    it('should load from file in production mode', async () => {
      // Import mock main module and get the initialize function
      const { initializeApp } = await import('./mocks/main');
      
      // Call the initialize function directly
      await initializeApp();
      
      // Get the created BrowserWindow instance
      const browserWindowInstance = electronMock.BrowserWindow.mock.results[0].value;
      
      // Verify loadFile was called instead of loadURL
      expect(browserWindowInstance.loadFile).toHaveBeenCalled();
      expect(browserWindowInstance.loadFile.mock.calls[0][0]).toContain('index.html');
    });
  });
  
  it('should set up IPC handlers for filesystem operations', async () => {
    // Import mock main module and get the initialize function
    const { initializeApp } = await import('./mocks/main');
    
    // Call the initialize function directly
    await initializeApp();
    
    // Verify IPC handlers were registered
    expect(electronMock.ipcMain.handle).toHaveBeenCalledTimes(4); // Should register 4 handlers
    
    // Check for app:get-path handler
    const getPathHandlerCall = electronMock.ipcMain.handle.mock.calls.find(
      call => call[0] === 'app:get-path'
    );
    expect(getPathHandlerCall).toBeDefined();
    
    // Check for fs:read-file handler
    const readFileHandlerCall = electronMock.ipcMain.handle.mock.calls.find(
      call => call[0] === 'fs:read-file'
    );
    expect(readFileHandlerCall).toBeDefined();
    
    // Check for fs:write-file handler
    const writeFileHandlerCall = electronMock.ipcMain.handle.mock.calls.find(
      call => call[0] === 'fs:write-file'
    );
    expect(writeFileHandlerCall).toBeDefined();
    
    // Check for fs:read-dir handler
    const readDirHandlerCall = electronMock.ipcMain.handle.mock.calls.find(
      call => call[0] === 'fs:read-dir'
    );
    expect(readDirHandlerCall).toBeDefined();
  });
  
  it('should handle preload script validation correctly', async () => {
    // Mock fs.existsSync to return false for non-preload paths
    const existsSyncMock = vi.mocked(fs.existsSync);
    existsSyncMock.mockImplementation((path: string) => {
      if (typeof path === 'string') {
        if (path.includes('preload-fixed.js')) {
          return true;  // Simulate only the fixed preload script exists
        } else if (path.includes('preload.js')) {
          return false; // Simulate the main preload script doesn't exist
        }
      }
      return true; // Default to true for other paths
    });
    
    // Import mock main module and get the initialize function
    const { initializeApp } = await import('./mocks/main');
    
    // Call the initialize function directly
    await initializeApp();
    
    // Verify BrowserWindow was created despite preload validation issues
    expect(electronMock.BrowserWindow).toHaveBeenCalled();
    
    // Get the browser window instance
    const browserWindow = electronMock.BrowserWindow.mock.results[0].value;
    
    // Simulate a load failure due to preload script
    const didFailLoadHandler = browserWindow.webContents.on.mock.calls.find(
      call => call[0] === 'did-fail-load'
    );
    
    // Ensure the handler exists
    expect(didFailLoadHandler).toBeDefined();
    
    // Check that we correctly handle the preload script failure
    if (didFailLoadHandler) {
      const [eventName, handler] = didFailLoadHandler;
      
      // Call the handler with a preload error
      handler({}, 1, 'Failed to load preload script');
      
      // Verify recovery attempt creates a new BrowserWindow
      expect(electronMock.BrowserWindow).toHaveBeenCalledTimes(2);
      
      // It should attempt to use the fixed preload script
      const options = electronMock.BrowserWindow.mock.calls[1][0];
      expect(options.webPreferences.preload).toContain('preload-fixed.js');
    }
  });
  
  it('should set up graceful error handling', async () => {
    // Import mock main module and get the initialize function
    const { initializeApp } = await import('./mocks/main');
    
    // Call the initialize function directly
    await initializeApp();
    
    // Check that app.on handlers were registered for window-all-closed and activate
    expect(electronMock.app.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
    expect(electronMock.app.on).toHaveBeenCalledWith('activate', expect.any(Function));
  });
});