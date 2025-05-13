/**
 * Preload Script Loading Test
 * 
 * Tests that the preload script is correctly loaded in different environments
 * and that it properly exposes the expected APIs to the renderer process.
 * This is critical for the correct functioning of Electron's contextBridge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';

describe('Preload Script Loading', () => {
  // Mock Electron modules
  const mockContextBridge = {
    exposeInMainWorld: vi.fn()
  };
  
  const mockIpcRenderer = {
    on: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn()
  };
  
  // Original environment variables
  const originalNodeEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    // Reset mocks and modules
    vi.resetModules();
    vi.resetAllMocks();
    
    // Set up test environment
    process.env.NODE_ENV = 'test';
    
    // Mock Electron modules
    vi.mock('electron', () => ({
      contextBridge: mockContextBridge,
      ipcRenderer: mockIpcRenderer
    }));
  });
  
  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });
  
  it('should expose electron object to the renderer process', async () => {
    // Import the preload script
    await import('../main/preload/preload');
    
    // Verify that contextBridge.exposeInMainWorld was called correctly
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'electron', 
      expect.any(Object)
    );
    
    // Get the exposed electron object from the first call
    const firstCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    const exposedElectron = firstCall[1];
    
    // Verify it contains essential path methods
    expect(exposedElectron.path).toBeDefined();
    expect(exposedElectron.path.join).toBeDefined();
    expect(exposedElectron.path.resolve).toBeDefined();
    expect(typeof exposedElectron.path.join).toBe('function');
    expect(typeof exposedElectron.path.resolve).toBe('function');
    
    // Verify it contains other expected APIs
    expect(exposedElectron.send).toBeDefined();
    expect(exposedElectron.on).toBeDefined();
    expect(exposedElectron.fs).toBeDefined();
    expect(exposedElectron.getPath).toBeDefined();
  });
  
  it('should also expose path object directly for compatibility', async () => {
    // Import the preload script
    await import('../main/preload/preload');
    
    // Verify contextBridge.exposeInMainWorld was called with path
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'path', 
      expect.any(Object)
    );
    
    // Get the path object from the calls
    const calls = mockContextBridge.exposeInMainWorld.mock.calls;
    const pathCall = calls.find(call => call[0] === 'path');
    const exposedPath = pathCall?.[1];
    
    // Verify it contains the expected path methods
    expect(exposedPath).toBeDefined();
    expect(exposedPath.join).toBeDefined();
    expect(exposedPath.resolve).toBeDefined();
    expect(exposedPath.basename).toBeDefined();
    expect(exposedPath.dirname).toBeDefined();
    expect(exposedPath.extname).toBeDefined();
    expect(exposedPath.sep).toBeDefined();
  });
  
  it('should connect filesystem methods to IPC renderer', async () => {
    // Import the preload script
    await import('../main/preload/preload');
    
    // Get the exposed electron object from the calls
    const firstCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    const exposedElectron = firstCall[1];
    
    // Call the getPath method
    const testPath = 'userData';
    exposedElectron.getPath(testPath);
    
    // Verify it uses ipcRenderer.invoke with correct arguments
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:get-path', testPath);
    
    // Reset mocks for next check
    mockIpcRenderer.invoke.mockReset();
    
    // Test readFile method
    const testFilePath = '/path/to/file.txt';
    exposedElectron.readFile(testFilePath);
    
    // Verify it uses ipcRenderer.invoke with correct arguments
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:read-file', testFilePath);
  });
  
  it('should correctly handle IPC communication methods', async () => {
    // Import the preload script
    await import('../main/preload/preload');
    
    // Get the exposed electron object from the calls
    const firstCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    const exposedElectron = firstCall[1];
    
    // Test the send method
    const testChannel = 'test-channel';
    const testArg1 = 'test-arg1';
    const testArg2 = { test: 'arg2' };
    
    exposedElectron.send(testChannel, testArg1, testArg2);
    
    // Verify it uses ipcRenderer.send with correct arguments
    expect(mockIpcRenderer.send).toHaveBeenCalledWith(testChannel, testArg1, testArg2);
    
    // Test the on method
    const testListener = vi.fn();
    exposedElectron.on(testChannel, testListener);
    
    // Verify it uses ipcRenderer.on with a function
    expect(mockIpcRenderer.on).toHaveBeenCalledWith(testChannel, expect.any(Function));
    
    // Test the wrapper function that strips the event object
    const onCall = mockIpcRenderer.on.mock.calls[0];
    const wrapperFunction = onCall[1];
    
    // Call the wrapper function with an event and args
    const mockEvent = { sender: 'test' };
    wrapperFunction(mockEvent, testArg1, testArg2);
    
    // Verify listener was called with just the args (no event object)
    expect(testListener).toHaveBeenCalledWith(testArg1, testArg2);
    expect(testListener).not.toHaveBeenCalledWith(mockEvent, testArg1, testArg2);
  });
  
  it('should expose isPackaged property based on NODE_ENV', async () => {
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    // Import the preload script in production mode
    await import('../main/preload/preload');
    
    // Get the exposed electron object from the calls
    const firstCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    const prodElectron = firstCall[1];
    
    // In production, isPackaged should be true
    expect(prodElectron.isPackaged).toBe(true);
    
    // Reset for development test
    vi.resetModules();
    mockContextBridge.exposeInMainWorld.mockReset();
    process.env.NODE_ENV = 'development';
    
    // Import the preload script in development mode
    await import('../main/preload/preload');
    
    // Get the exposed electron object again
    const devCall = mockContextBridge.exposeInMainWorld.mock.calls[0];
    const devElectron = devCall[1];
    
    // In development, isPackaged should be false
    expect(devElectron.isPackaged).toBe(false);
  });
});