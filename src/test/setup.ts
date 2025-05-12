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

// Mock window.electron if needed for renderer process
Object.defineProperty(window, 'electron', {
  value: {
    sendError: vi.fn(),
    log: vi.fn(),
  },
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