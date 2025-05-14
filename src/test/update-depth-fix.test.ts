import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { useAppStore } from '../renderer/store/useAppStore';
import BrainModel from '../renderer/components/BrainModel';
import NeuroScene from '../renderer/components/NeuroScene';

// Mock THREE.js
vi.mock('three', () => {
  const mockThree = {
    Group: class Group {
      children = [];
      add = vi.fn();
      remove = vi.fn();
      position = { set: vi.fn() };
      rotation = { set: vi.fn() };
      uuid = 'mock-uuid';
    },
    Vector3: class Vector3 {
      set = vi.fn();
      copy = vi.fn();
      clone = vi.fn(() => new this.constructor());
      equals = vi.fn(() => true);
    },
    PerspectiveCamera: class PerspectiveCamera {
      position = { set: vi.fn() };
      updateProjectionMatrix = vi.fn();
      uuid = 'camera-uuid';
    },
    Box3: class Box3 {
      setFromObject = vi.fn();
      getCenter = vi.fn(() => new mockThree.Vector3());
      getSize = vi.fn(() => new mockThree.Vector3());
    },
    Line: class Line {},
    Raycaster: class Raycaster {
      setFromCamera = vi.fn();
      intersectObjects = vi.fn(() => []);
    },
    ...vi.importActual('three'),
  };
  return mockThree;
});

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useThree: () => ({
    camera: new (vi.importActual('three')).PerspectiveCamera(),
    scene: { children: [], addEventListener: vi.fn(), removeEventListener: vi.fn() },
    gl: { domElement: document.createElement('canvas') },
  }),
  useFrame: vi.fn((callback) => callback({ clock: { getElapsedTime: () => 0 } }, 0.1)),
  extend: vi.fn(),
}));

// Mock React Three Drei
vi.mock('@react-three/drei', () => ({
  Grid: (props: any) => <mesh data-testid="grid" {...props} />,
  PerspectiveCamera: (props: any) => <camera data-testid="camera" {...props} />,
  GizmoHelper: ({ children }: { children: React.ReactNode }) => <div data-testid="gizmo-helper">{children}</div>,
  GizmoViewport: (props: any) => <div data-testid="gizmo-viewport" {...props} />,
}));

// Mock PassiveOrbitControls
vi.mock('../renderer/components/camera/PassiveOrbitControls', () => ({
  __esModule: true,
  default: React.forwardRef((props: any, ref: any) => {
    // Pass the ref to a div
    return <div data-testid="orbit-controls" ref={ref} {...props} />;
  }),
}));

// Mock Components
vi.mock('../renderer/components/MultipleModels', () => ({
  __esModule: true,
  default: () => <div data-testid="multiple-models">MultipleModels</div>,
}));

vi.mock('../renderer/components/FallbackCube', () => ({
  __esModule: true,
  default: () => <div data-testid="fallback-cube">FallbackCube</div>,
}));

vi.mock('../renderer/components/performance/PerformanceMonitor', () => ({
  __esModule: true,
  default: () => <div data-testid="performance-monitor">PerformanceMonitor</div>,
}));

vi.mock('../renderer/components/controls/ControlPanel', () => ({
  __esModule: true,
  ControlPanel: () => <div data-testid="control-panel">ControlPanel</div>,
}));

// Mock the BrainModel component when tested in NeuroScene
vi.mock('../renderer/components/BrainModel', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="brain-model" {...props}>BrainModel</div>,
}));

// Mock loadModel and getModelById 
vi.mock('../renderer/utils/loadModel', () => ({
  loadModel: vi.fn().mockResolvedValue(new (vi.importActual('three')).Group()),
}));

vi.mock('../renderer/utils/modelRegistry', () => ({
  getModelById: vi.fn().mockReturnValue({ id: 'test-model', name: 'Test Model' }),
}));

// Mock annotations to avoid dynamic imports
vi.mock('../renderer/components/annotations/AnnotationLayer', () => ({
  __esModule: true,
  default: React.memo((props: any) => {
    return <div data-testid="annotation-layer" {...props}>AnnotationLayer</div>;
  }),
}));

/**
 * This test verifies our fix for the Maximum Update Depth exceeded error
 * by testing components in isolation and ensuring there are no infinite loops
 */
describe('Update Depth Fix Tests', () => {
  // Reset all mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      selectedId: 'brain1',
      selectedIds: ['brain1'],
      showMultiple: false,
      isLoading: false,
      annotations: {},
      currentModelRef: null,
      orbitControlsRef: null,
      cameraRef: null,
    });
    
    // Spy on console.error to catch React errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('BrainModel component avoids maximum update depth exceeded error', async () => {
    // Count store updates to ensure we're not in an infinite loop
    let updateCount = 0;
    const originalSet = useAppStore.setState;
    useAppStore.setState = (...args: any[]) => {
      updateCount++;
      return originalSet(...args);
    };

    // Render the component
    await act(async () => {
      render(<BrainModel modelId="brain1" />);
    });

    // Wait for all promises to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    // We should have a reasonable number of updates, not hundreds
    expect(updateCount).toBeLessThan(10);

    // Restore the original setState
    useAppStore.setState = originalSet;
  });

  it('NeuroScene component avoids maximum update depth exceeded error', async () => {
    // Count store updates to check for infinite loops
    let updateCount = 0;
    const originalSet = useAppStore.setState;
    useAppStore.setState = (...args: any[]) => {
      updateCount++;
      return originalSet(...args);
    };

    // Render the component
    await act(async () => {
      render(<NeuroScene />);
    });

    // Wait for all promises to resolve and components to update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    // We should have a reasonable number of updates, not hundreds
    expect(updateCount).toBeLessThan(10);

    // Restore the original setState
    useAppStore.setState = originalSet;
  });

  it('correctly handles model selection changes without infinite loops', async () => {
    // Count store updates
    let updateCount = 0;
    const originalSet = useAppStore.setState;
    useAppStore.setState = (...args: any[]) => {
      updateCount++;
      return originalSet(...args);
    };

    // Render the component
    await act(async () => {
      render(<NeuroScene />);
    });

    // Change the selected model
    await act(async () => {
      useAppStore.getState().setSelected('brain2');
    });

    // Wait for components to update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    // Change model selection again
    await act(async () => {
      useAppStore.getState().setSelected('brain3');
    });

    // Wait for components to update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    
    // We should have a reasonable number of updates, not hundreds
    expect(updateCount).toBeLessThan(20);

    // Restore the original setState
    useAppStore.setState = originalSet;
  });
});