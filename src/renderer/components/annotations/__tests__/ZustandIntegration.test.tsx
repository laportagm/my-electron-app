import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { Canvas } from '@react-three/fiber';
import AnnotationLayer from '../AnnotationLayer';

// Mock Three.js and @react-three/fiber which are already mocked in setup.ts
// We're just ensuring this test has the proper context

// Mock the Zustand store for testing selector patterns
vi.mock('@/store/useAppStore', () => {
  // Create mock state
  const mockState = {
    annotations: {
      'test-1': { id: 'test-1', modelId: 'model-1', position: { x: 0, y: 0, z: 0 } },
      'test-2': { id: 'test-2', modelId: 'model-1', position: { x: 1, y: 1, z: 1 } },
      'test-3': { id: 'test-3', modelId: 'model-2', position: { x: 2, y: 2, z: 2 } }
    },
    isCreating: false,
    selectAnnotation: vi.fn(),
    addAnnotation: vi.fn(),
    toggleCreationMode: vi.fn()
  };
  
  // Track selector calls and store updates
  let selectorCallCount = 0;
  let getStateCallCount = 0;
  let listeners: Function[] = [];
  
  // Create a mock store instance
  const mockUseAppStore = vi.fn().mockImplementation((selector) => {
    if (typeof selector === 'function') {
      selectorCallCount++;
      return selector(mockState);
    }
    return mockState;
  });
  
  // Add methods to the store
  mockUseAppStore.getState = vi.fn(() => {
    getStateCallCount++;
    return mockState;
  });
  
  mockUseAppStore.setState = vi.fn((updater) => {
    if (typeof updater === 'function') {
      Object.assign(mockState, updater(mockState));
    } else {
      Object.assign(mockState, updater);
    }
    listeners.forEach(listener => listener());
  });
  
  mockUseAppStore.subscribe = vi.fn((listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  });
  
  // Export testing utilities
  mockUseAppStore._counters = {
    getSelectorCallCount: () => selectorCallCount,
    getGetStateCallCount: () => getStateCallCount,
    resetCounts: () => { selectorCallCount = 0; getStateCallCount = 0; }
  };
  
  // Export a shallow comparison function
  const originalShallow = (a: any, b: any) => a === b;
  return {
    useAppStore: mockUseAppStore,
    shallow: originalShallow
  };
});

// Retrieve the counter methods for verification
const counters = (useAppStore as any)._counters;

describe('Zustand Integration in AnnotationLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.resetCounts();
  });
  
  it('avoids infinite loops with proper selector memoization', () => {
    // Initial render
    const { rerender } = render(
      <Canvas>
        <AnnotationLayer modelId="model-1" />
      </Canvas>
    );
    
    const initialSelectorCalls = counters.getSelectorCallCount();
    expect(initialSelectorCalls).toBeGreaterThan(0);
    
    // Force multiple rerenders to test for infinite loops
    for (let i = 0; i < 5; i++) {
      act(() => {
        rerender(
          <Canvas>
            <AnnotationLayer modelId="model-1" />
          </Canvas>
        );
      });
    }
    
    // If there's an infinite loop, the number of selector calls would grow exponentially
    // For a fixed number of rerenders, we expect approximately linear growth
    // We use a multiplier of 2 to allow for some overhead, but definitely not exponential growth
    expect(counters.getSelectorCallCount()).toBeLessThanOrEqual(initialSelectorCalls * 2);
  });
  
  it('minimizes direct calls to getState() during renders', () => {
    render(
      <Canvas>
        <AnnotationLayer modelId="model-1" />
      </Canvas>
    );
    
    // With our optimized code, there should be very few or no calls to getState() during rendering
    // The exact number might vary, but it should be small and consistent
    expect(counters.getGetStateCallCount()).toBeLessThanOrEqual(2);
  });
  
  it('handles prop changes efficiently', () => {
    const { rerender } = render(
      <Canvas>
        <AnnotationLayer modelId="model-1" />
      </Canvas>
    );
    
    // Record selector calls before the prop change
    const beforePropChangeCalls = counters.getSelectorCallCount();
    counters.resetCounts();
    
    // Change the modelId prop
    act(() => {
      rerender(
        <Canvas>
          <AnnotationLayer modelId="model-2" />
        </Canvas>
      );
    });
    
    // There should be selector calls to update for the new modelId
    expect(counters.getSelectorCallCount()).toBeGreaterThan(0);
    
    // Reset counter
    counters.resetCounts();
    
    // Rerender with the same modelId - should be more efficient
    act(() => {
      rerender(
        <Canvas>
          <AnnotationLayer modelId="model-2" />
        </Canvas>
      );
    });
    
    // Should have fewer selector calls when props don't change
    // This verifies our memoization is working properly
    expect(counters.getSelectorCallCount()).toBeLessThan(beforePropChangeCalls);
  });
  
  it('preserves selector independence with proper memoization', () => {
    // Spy on React's useState to verify internal state doesn't update unnecessarily
    const useStateSpy = vi.spyOn(React, 'useState');
    
    render(
      <Canvas>
        <AnnotationLayer modelId="model-1" />
      </Canvas>
    );
    
    const initialUseStateCalls = useStateSpy.mock.calls.length;
    
    // Manually trigger store update unrelated to annotations
    act(() => {
      useAppStore.setState({ isCreating: true });
    });
    
    // A change to isCreating should not cause unnecessary rerenders of annotation data
    // since our selectors should be properly memoized
    expect(useStateSpy.mock.calls.length - initialUseStateCalls).toBeLessThanOrEqual(2);
    
    // Cleanup
    useStateSpy.mockRestore();
  });
});