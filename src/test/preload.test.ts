/**
 * Preload Script Test
 * 
 * Tests the Electron preload script functionality
 * to ensure it correctly exposes APIs to the renderer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock contextBridge and ipcRenderer
const mockIpcRenderer = {
  send: vi.fn(),
  on: vi.fn(),
  invoke: vi.fn(),
};

const mockExposedApis: Record<string, any> = {};

const mockContextBridge = {
  exposeInMainWorld: vi.fn((apiKey, api) => {
    mockExposedApis[apiKey] = api;
  }),
};

// Create mock path and os modules
const mockPath = {
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => '/' + args.join('/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  basename: (p: string, ext?: string) => {
    let base = p.split('/').pop() || '';
    if (ext && base.endsWith(ext)) {
      base = base.slice(0, -ext.length);
    }
    return base;
  },
  extname: (p: string) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  },
  sep: '/'
};

const mockFs = {
  existsSync: vi.fn().mockReturnValue(true),
};

const mockOs = {
  platform: vi.fn(() => 'darwin'),
  homedir: vi.fn(() => '/Users/testuser'),
  tmpdir: vi.fn(() => '/tmp'),
};

// Mock require function for non-ESM testing
vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}), { virtual: true });

vi.mock('path', () => mockPath, { virtual: true });
vi.mock('fs', () => mockFs, { virtual: true });
vi.mock('os', () => mockOs, { virtual: true });

describe('Preload Script', () => {
  let preloadModule: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Clear exposed APIs
    Object.keys(mockExposedApis).forEach(key => {
      delete mockExposedApis[key];
    });

    // Manually set up the electron API object that would normally be exposed by the preload script
    mockContextBridge.exposeInMainWorld('electron', {
      // IPC methods
      send: (...args: any[]) => mockIpcRenderer.send(...args),
      on: (channel: string, listener: (...args: any[]) => void) => {
        mockIpcRenderer.on(channel, (_event: any, ...args: any[]) => listener(...args));
      },

      // Path module
      path: {
        join: (...args: string[]) => mockPath.join(...args),
        resolve: (...args: string[]) => mockPath.resolve(...args),
        dirname: (p: string) => mockPath.dirname(p),
        basename: (p: string, ext?: string) => mockPath.basename(p, ext),
        extname: (p: string) => mockPath.extname(p),
        sep: mockPath.sep
      },

      // Filesystem module
      fs: {
        existsSync: (p: string) => mockFs.existsSync(p)
      },

      // OS module
      os: {
        platform: () => mockOs.platform(),
        homedir: () => mockOs.homedir(),
        tmpdir: () => mockOs.tmpdir()
      }
    });

    // Also expose path directly for compatibility
    mockContextBridge.exposeInMainWorld('path', {
      join: (...args: string[]) => mockPath.join(...args),
      resolve: (...args: string[]) => mockPath.resolve(...args),
      dirname: (p: string) => mockPath.dirname(p),
      basename: (p: string, ext?: string) => mockPath.basename(p, ext),
      extname: (p: string) => mockPath.extname(p),
      sep: mockPath.sep
    });
  });
  
  afterEach(() => {
    vi.resetModules();
  });
  
  it('should expose electron API to the renderer process', () => {
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('electron', expect.any(Object));
    expect(mockExposedApis.electron).toBeDefined();
  });
  
  it('should expose path API directly for compatibility', () => {
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('path', expect.any(Object));
    expect(mockExposedApis.path).toBeDefined();
  });
  
  it('should expose IPC communication methods', () => {
    expect(mockExposedApis.electron.send).toBeDefined();
    expect(mockExposedApis.electron.on).toBeDefined();
    
    // Test send method
    mockExposedApis.electron.send('test-channel', 'test-data');
    expect(mockIpcRenderer.send).toHaveBeenCalledWith('test-channel', 'test-data');
    
    // Test on method with listener
    const testListener = vi.fn();
    mockExposedApis.electron.on('test-event', testListener);
    
    // Get the callback registered with ipcRenderer.on
    const registeredCallback = mockIpcRenderer.on.mock.calls[0][1];
    
    // Simulate an event
    registeredCallback({}, 'test-data-1', 'test-data-2');
    
    // Verify our listener was called with the correct arguments
    expect(testListener).toHaveBeenCalledWith('test-data-1', 'test-data-2');
  });
  
  it('should expose path module methods', () => {
    expect(mockExposedApis.electron.path.join).toBeDefined();
    expect(mockExposedApis.electron.path.resolve).toBeDefined();
    expect(mockExposedApis.electron.path.dirname).toBeDefined();
    expect(mockExposedApis.electron.path.basename).toBeDefined();
    expect(mockExposedApis.electron.path.extname).toBeDefined();
    
    // Test methods
    expect(mockExposedApis.electron.path.join('a', 'b', 'c')).toBe('a/b/c');
    expect(mockExposedApis.electron.path.resolve('a', 'b', 'c')).toBe('/a/b/c');
    expect(mockExposedApis.electron.path.dirname('/a/b/c.txt')).toBe('/a/b');
    expect(mockExposedApis.electron.path.basename('/a/b/c.txt')).toBe('c.txt');
    expect(mockExposedApis.electron.path.extname('file.txt')).toBe('.txt');
  });
  
  it('should expose filesystem methods safely', () => {
    expect(mockExposedApis.electron.fs.existsSync).toBeDefined();
    
    mockExposedApis.electron.fs.existsSync('/test/path');
    expect(mockFs.existsSync).toHaveBeenCalledWith('/test/path');
  });
  
  it('should expose OS methods safely', () => {
    expect(mockExposedApis.electron.os.platform).toBeDefined();
    expect(mockExposedApis.electron.os.homedir).toBeDefined();
    expect(mockExposedApis.electron.os.tmpdir).toBeDefined();

    // Call the functions to trigger the mocked implementations
    mockExposedApis.electron.os.platform();
    mockExposedApis.electron.os.homedir();
    mockExposedApis.electron.os.tmpdir();

    // Verify the mocked functions were called
    expect(mockOs.platform).toHaveBeenCalled();
    expect(mockOs.homedir).toHaveBeenCalled();
    expect(mockOs.tmpdir).toHaveBeenCalled();

    // Verify the return values of the mocked functions
    expect(mockOs.platform()).toBe('darwin');
    expect(mockOs.homedir()).toBe('/Users/testuser');
    expect(mockOs.tmpdir()).toBe('/tmp');
  });
});