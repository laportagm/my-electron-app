// Setup file for Vitest testing environment
// This is imported via vitest.config.ts and not included in the production build

import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'
import mockThree from './mocks/three-updated'
import mockR3F from './mocks/r3f'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup()
})

// R3F warnings are now suppressed in vitest.config.ts using onConsoleLog

// Use centralized Three.js mock
vi.mock('three', () => mockThree)

// Use the centralized React Three Fiber mock
vi.mock('@react-three/fiber', () => mockR3F)

// Mock Draco loader and GLTF loader
vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => {
  return {
    DRACOLoader: vi.fn().mockImplementation(() => ({
      setDecoderPath: vi.fn(),
    })),
  }
})

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  return {
    GLTFLoader: vi.fn().mockImplementation(() => {
      const loader = {
        load: vi.fn().mockImplementation((url, onLoad) => {
          onLoad({ scene: { children: [] } })
        }),
        loadAsync: vi.fn().mockImplementation(() => {
          return Promise.resolve({ scene: new mockThree.Group() })
        }),
        setDRACOLoader: vi.fn().mockReturnThis(),
        setCrossOrigin: vi.fn().mockReturnThis(),
        setKTX2Loader: vi.fn().mockReturnThis(),
        setMeshoptDecoder: vi.fn().mockReturnThis()
      }
      return loader
    }),
  }
})

// Mock drei components
vi.mock('@react-three/drei', () => {
  return {
    OrbitControls: vi.fn().mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'mock-orbit-controls' })),
    Grid: vi.fn().mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'mock-grid' })),
    PerspectiveCamera: vi.fn().mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'mock-camera' })),
    GizmoHelper: vi.fn().mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'mock-gizmo-helper' })),
    GizmoViewport: vi.fn().mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'mock-gizmo-viewport' })),
    Environment: vi.fn().mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'mock-environment' })),
    Center: vi.fn().mockImplementation(({ children }) =>
      React.createElement('div', { 'data-testid': 'mock-center' }, children)),
    Text: vi.fn().mockImplementation(({ children }) =>
      React.createElement('div', { 'data-testid': 'mock-text' }, children)),
  }
})

// Create a comprehensive path module mock
const pathMock = {
  join: vi.fn((...parts) => parts.join('/')),
  resolve: vi.fn((...parts) => '/' + parts.join('/')),
  dirname: vi.fn(p => p.substring(0, p.lastIndexOf('/'))),
  basename: vi.fn((p, ext) => {
    let base = p.substring(p.lastIndexOf('/') + 1);
    if (ext && base.endsWith(ext)) {
      base = base.substring(0, base.length - ext.length);
    }
    return base;
  }),
  extname: vi.fn(p => {
    const index = p.lastIndexOf('.');
    return index < 0 ? '' : p.substring(index);
  }),
  sep: '/',
  delimiter: ':'
};

// Mock the path module
vi.mock('path', () => {
  return {
    ...pathMock,
    default: pathMock
  };
});

// Create mock for Electron app module with a helper for executing the app ready callback
const electronMock = {
  app: {
    whenReady: vi.fn().mockReturnValue({
      then: vi.fn(cb => {
        // Store the callback but don't execute it automatically
        electronMock._stored.appReadyCallback = cb;
        return { catch: vi.fn() };
      })
    }),
    on: vi.fn(),
    getPath: vi.fn(name => `/mock/${name}`),
    getAppPath: vi.fn().mockReturnValue('/mock/app/path'),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      on: vi.fn(),
      session: {
        webRequest: {
          onHeadersReceived: vi.fn()
        }
      }
    },
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
    close: vi.fn(),
    destroy: vi.fn()
  })),
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn()
  },
  session: {
    defaultSession: {
      webRequest: {
        onBeforeRequest: vi.fn()
      }
    }
  },
  dialog: {
    showErrorBox: vi.fn()
  },
  // Helpers for test
  _stored: {
    appReadyCallback: null as Function | null,
    executeAppReadyCallback: async function() {
      if (this.appReadyCallback) {
        await this.appReadyCallback();
        return true;
      }
      return false;
    }
  }
};

// Add getAllWindows to BrowserWindow
electronMock.BrowserWindow.getAllWindows = vi.fn().mockReturnValue([]);

// Mock the electron module
vi.mock('electron', () => electronMock);

// Export the electronMock for use in tests
(global as any).electronMock = electronMock;

// Enhanced window.electron mock with path utilities
Object.defineProperty(window, 'electron', {
  value: {
    sendError: vi.fn(),
    log: vi.fn(),
    // Add path functions using the same implementations as pathMock
    path: {
      join: vi.fn((...parts) => pathMock.join(...parts)),
      resolve: vi.fn((...parts) => pathMock.resolve(...parts)),
      dirname: vi.fn(p => pathMock.dirname(p)),
      basename: vi.fn((p, ext) => pathMock.basename(p, ext)),
      extname: vi.fn(p => pathMock.extname(p)),
      sep: '/',
      delimiter: ':'
    },
    // Add other API properties needed by tests
    getPath: vi.fn(name => `/mock/${name}`),
    isPackaged: false
  },
  writable: true,
  configurable: true
})

// Mock config module
vi.mock('../../utils/config', () => import('./mocks/config'))
vi.mock('../utils/config', () => import('./mocks/config'))

// Mock matchMedia for responsive design testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Fix TextEncoder and TextDecoder issue with instanceof
// This is necessary because esbuild requires TextEncoder to return true for instanceof Uint8Array
class FixedTextEncoder extends TextEncoder {
  encode(input?: string): Uint8Array {
    const result = super.encode(input);
    // Ensure result properly passes instanceof checks
    Object.setPrototypeOf(result, Uint8Array.prototype);
    return result;
  }
}

// Replace global TextEncoder with fixed version
global.TextEncoder = FixedTextEncoder;