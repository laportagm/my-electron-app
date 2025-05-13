// Setup file for Vitest testing environment with TextEncoder fix
// This is imported via vitest.config.ts and not included in the production build

// Import the TextEncoder fix first to ensure it's applied
import './esbuild-encoder-fix';

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

// Use centralized Three.js mock
vi.mock('three', () => mockThree)

// Mock react-three-fiber using string representation for the JSX
vi.mock('@react-three/fiber', () => {
  const mockScene = mockThree.Scene();

  // Create an enhanced Canvas mock that supports event handlers
  const CanvasMock = vi.fn().mockImplementation(({ children, ...props }) => {
    // Create a div element with Canvas props and mock event handlers
    const element = React.createElement('div', { 
      'data-testid': 'mock-canvas',
      // Add __handlers property to support pointer events in tests
      __handlers: {
        pointermove: vi.fn(),
        pointerdown: vi.fn(),
        pointerup: vi.fn(),
        click: vi.fn(),
      },
      ...props 
    }, children);
    
    // Attach event handlers after rendering
    setTimeout(() => {
      if (element.props.onPointerMove) {
        element.props.__handlers.pointermove = element.props.onPointerMove;
      }
      if (element.props.onPointerDown) {
        element.props.__handlers.pointerdown = element.props.onPointerDown;
      }
      if (element.props.onPointerUp) {
        element.props.__handlers.pointerup = element.props.onPointerUp;
      }
      if (element.props.onClick) {
        element.props.__handlers.click = element.props.onClick;
      }
    }, 0);
    
    return element;
  });

  return {
    Canvas: CanvasMock,
    useThree: vi.fn().mockReturnValue({
      scene: mockScene,
      camera: {
        position: { x: 0, y: 0, z: 5 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        fov: 75,
        aspect: 1.5,
        updateProjectionMatrix: vi.fn(),
      },
      gl: {
        domElement: {
          clientWidth: 800,
          clientHeight: 600,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
      }
    }),
    useFrame: vi.fn().mockImplementation(callback => {
      // Call the callback once to simulate a frame
      callback({ clock: { getElapsedTime: () => 0 } }, 0.1);
    })
  }
})

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
    GLTFLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockImplementation((url, onLoad) => {
        onLoad({ scene: { children: [] } })
      }),
      setDRACOLoader: vi.fn(),
    })),
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

// Mock window.electron if needed for renderer process
Object.defineProperty(window, 'electron', {
  value: {
    sendError: vi.fn(),
    log: vi.fn(),
  },
})

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