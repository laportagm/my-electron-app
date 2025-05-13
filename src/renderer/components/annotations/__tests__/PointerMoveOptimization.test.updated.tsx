import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Canvas } from '@react-three/fiber';
import AnnotationLayer from '../AnnotationLayer';
import * as THREE from 'three';

// Mock THREE.js and React Three Fiber
vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Canvas: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => {
      // Create a div element with mock event handlers
      return React.createElement('div', {
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
    },
    useThree: vi.fn().mockReturnValue({
      camera: {
        position: { x: 0, y: 0, z: 5 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 }
      },
      scene: {
        children: [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
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
  };
});

// Mock the Zustand store
vi.mock('@/store/useAppStore', () => {
  const mockStore = {
    annotations: {},
    isCreating: true, // Set to true to test pointer move handling
    selectAnnotation: vi.fn(),
    addAnnotation: vi.fn(),
    toggleCreationMode: vi.fn()
  };
  
  const mockUseAppStore = vi.fn().mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  });
  
  mockUseAppStore.getState = vi.fn().mockReturnValue(mockStore);
  
  return {
    useAppStore: mockUseAppStore,
    shallow: (a: any, b: any) => a === b
  };
});

// Set up performance monitoring
describe('PointerMove Optimization', () => {
  // Track requestAnimationFrame calls
  let rafCallCount = 0;
  let rafCallbacks: Function[] = [];
  
  beforeEach(() => {
    vi.clearAllMocks();
    rafCallCount = 0;
    rafCallbacks = [];
    
    // Mock requestAnimationFrame to track calls
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallCount++;
      const id = rafCallCount;
      rafCallbacks.push(() => callback(0));
      return id;
    });
    
    // Mock cancelAnimationFrame
    window.cancelAnimationFrame = vi.fn((id) => {
      // Cancel by removing from callbacks
      rafCallbacks = rafCallbacks.filter((_, index) => index !== id - 1);
    });
  });
  
  it('uses requestAnimationFrame for raycasting to offload from the event handler', () => {
    const { container } = render(
      <Canvas>
        <AnnotationLayer modelId="test-model" />
      </Canvas>
    );
    
    // Get the canvas element wrapper
    const canvasWrapper = container.querySelector('[data-testid="mock-canvas"]');
    expect(canvasWrapper).not.toBeNull();
    
    // Connect the mesh's onPointerMove handler to the mock handlers
    if (canvasWrapper) {
      // Find the mesh with the onPointerMove handler
      const meshWithHandler = container.querySelector('mesh');
      if (meshWithHandler && meshWithHandler.props && meshWithHandler.props.onPointerMove) {
        canvasWrapper.__handlers.pointermove = meshWithHandler.props.onPointerMove;
      }
    }
    
    // Create a mock pointer move event
    const mockEvent = {
      clientX: 400,
      clientY: 300,
      stopPropagation: vi.fn()
    } as unknown as THREE.Event;
    
    // Trigger rapid pointer move events to test throttling
    for (let i = 0; i < 10; i++) {
      act(() => {
        // Dispatch the events very quickly (same timestamp)
        canvasWrapper.__handlers.pointermove(mockEvent);
      });
    }
    
    // Check requestAnimationFrame was called less than 10 times
    // This verifies our throttling is working
    expect(rafCallCount).toBeLessThan(10);
    
    // Execute all requestAnimationFrame callbacks
    act(() => {
      rafCallbacks.forEach(callback => callback());
    });
  });
  
  it('uses dynamic throttling based on movement speed', () => {
    // Mock performance.now for consistent timing
    const originalNow = Date.now;
    Date.now = vi.fn().mockReturnValue(0);
    
    const { container } = render(
      <Canvas>
        <AnnotationLayer modelId="test-model" />
      </Canvas>
    );
    
    // Get the canvas element wrapper
    const canvasWrapper = container.querySelector('[data-testid="mock-canvas"]');
    expect(canvasWrapper).not.toBeNull();
    
    // Connect the mesh's onPointerMove handler to the mock handlers
    if (canvasWrapper) {
      // Find the mesh with the onPointerMove handler  
      const meshWithHandler = container.querySelector('mesh');
      if (meshWithHandler && meshWithHandler.props && meshWithHandler.props.onPointerMove) {
        canvasWrapper.__handlers.pointermove = meshWithHandler.props.onPointerMove;
      }
    }
    
    // Simulate a slow, precise movement
    // A small delta between points indicates slow movement
    const slowEvent1 = {
      clientX: 400,
      clientY: 300,
      stopPropagation: vi.fn()
    } as unknown as THREE.Event;
    
    const slowEvent2 = {
      clientX: 401, // Small movement
      clientY: 301,
      stopPropagation: vi.fn()
    } as unknown as THREE.Event;
    
    // Reset RAF tracking
    rafCallCount = 0;
    
    // First event always processes
    act(() => {
      canvasWrapper.__handlers.pointermove(slowEvent1);
    });
    
    expect(rafCallCount).toBe(1);
    
    // Increment time by 25ms - not enough for the fast throttle (100ms)
    // but enough for the slow throttle (30ms)
    Date.now = vi.fn().mockReturnValue(25);
    
    // Second event should process for slow movement
    act(() => {
      canvasWrapper.__handlers.pointermove(slowEvent2);
    });
    
    // Should have 2 RAF calls now (slow movement = faster updates)
    expect(rafCallCount).toBe(2);
    
    // Now test fast movement
    // Reset RAF tracking
    rafCallCount = 0;
    
    // Simulate a fast movement
    // A large delta between points indicates fast movement
    const fastEvent1 = {
      clientX: 400,
      clientY: 300,
      stopPropagation: vi.fn()
    } as unknown as THREE.Event;
    
    const fastEvent2 = {
      clientX: 450, // Large movement
      clientY: 350,
      stopPropagation: vi.fn()
    } as unknown as THREE.Event;
    
    // Reset time
    Date.now = vi.fn().mockReturnValue(0);
    
    // First event always processes
    act(() => {
      canvasWrapper.__handlers.pointermove(fastEvent1);
    });
    
    expect(rafCallCount).toBe(1);
    
    // Increment time by 50ms - not enough for the slow throttle (100ms for fast movement)
    Date.now = vi.fn().mockReturnValue(50);
    
    // Second event should not process for fast movement
    act(() => {
      canvasWrapper.__handlers.pointermove(fastEvent2);
    });
    
    // Should still have just 1 RAF call (fast movement = slower updates)
    expect(rafCallCount).toBe(1);
    
    // Restore original Date.now
    Date.now = originalNow;
  });
});