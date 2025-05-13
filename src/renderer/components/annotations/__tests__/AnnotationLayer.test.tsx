import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Canvas } from '@react-three/fiber';
import { __INTERNAL__, default as AnnotationLayer } from '../AnnotationLayer';
import { useAppStore } from '@/store/useAppStore';
import * as THREE from 'three';

// The centralized Three.js mock is loaded via setup.ts
// Using proper event handling in the new mock

// Mock the Zustand store
vi.mock('@/store/useAppStore', () => {
  const annotationsData = {
    'annotation-1': {
      id: 'annotation-1',
      modelId: 'test-model',
      position: { x: 1, y: 1, z: 1 },
      title: 'Test Annotation 1',
      content: 'Test content',
      visible: true,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    'annotation-2': {
      id: 'annotation-2',
      modelId: 'test-model',
      position: { x: 2, y: 2, z: 2 },
      title: 'Test Annotation 2',
      content: 'Test content 2',
      visible: true,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    'annotation-3': {
      id: 'annotation-3',
      modelId: 'other-model',
      position: { x: 3, y: 3, z: 3 },
      title: 'Test Annotation 3',
      content: 'Test content 3',
      visible: true,
      created_at: Date.now(),
      updated_at: Date.now()
    }
  };

  const mockStore = {
    annotations: annotationsData,
    isCreating: false,
    selectAnnotation: vi.fn(),
    addAnnotation: vi.fn(),
    toggleCreationMode: vi.fn()
  };

  // Create a mock function for useAppStore
  const mockUseAppStore = vi.fn().mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  });

  // Add getState as a method on the function itself
  mockUseAppStore.getState = vi.fn().mockReturnValue(mockStore);

  return {
    useAppStore: mockUseAppStore,
    shallow: (a, b) => a === b || (Array.isArray(a) && Array.isArray(b) &&
      a.length === b.length && a.every((val, idx) => val === b[idx]))
  };
});

// Mock AnnotationMarker component
vi.mock('../AnnotationMarker', () => {
  return {
    default: vi.fn().mockImplementation(({ annotation }) => (
      <div data-testid={`annotation-marker-${annotation.id}`} />
    ))
  };
});

describe('AnnotationLayer', () => {
  // Store the original console.error to restore after tests
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Mock console.error to catch React render errors
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <Canvas>
        <AnnotationLayer modelId="test-model" />
      </Canvas>
    );
    // If no errors, test passes
  });

  it('filters annotations by modelId', () => {
    const { container } = render(
      <Canvas>
        <AnnotationLayer modelId="test-model" />
      </Canvas>
    );

    // Check that only annotations for test-model are rendered (2 markers)
    expect(container.querySelectorAll('[data-testid^="annotation-marker-"]')).toHaveLength(2);
    expect(container.querySelector('[data-testid="annotation-marker-annotation-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="annotation-marker-annotation-2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="annotation-marker-annotation-3"]')).toBeNull();
  });

  it('does not re-render when modelId prop does not change', () => {
    const { arePropsEqual } = __INTERNAL__;

    // Create props objects
    const prevProps = { modelId: 'test-model' };
    const nextProps = { modelId: 'test-model' };

    // Test that arePropsEqual returns true when modelId is the same
    expect(arePropsEqual(prevProps, nextProps)).toBe(true);

    // Create props with different modelId
    const newProps = { modelId: 'different-model' };

    // Test that arePropsEqual returns false when modelId changes
    expect(arePropsEqual(prevProps, newProps)).toBe(false);
  });

  it('does not trigger infinite update loops with React 18 useSyncExternalStore', () => {
    // Create a mock for the useAppStore implementation to count selector calls
    let selectorCallCount = 0;

    // Replace the useAppStore mock for this specific test
    useAppStore.mockImplementation((selector, equalityFn) => {
      if (typeof selector === 'function') {
        selectorCallCount++;

        // Return a stable array of IDs to simulate a selector that filters annotations
        return ['annotation-1', 'annotation-2'];
      }

      // Return the full store object for direct property access
      return {
        annotations: {
          'annotation-1': { id: 'annotation-1', modelId: 'test-model' },
          'annotation-2': { id: 'annotation-2', modelId: 'test-model' }
        },
        isCreating: false,
        selectAnnotation: vi.fn(),
        addAnnotation: vi.fn(),
        getState: () => ({
          annotations: {
            'annotation-1': { id: 'annotation-1', modelId: 'test-model' },
            'annotation-2': { id: 'annotation-2', modelId: 'test-model' }
          }
        })
      };
    });

    // Render the component
    const { rerender } = render(
      <Canvas>
        <AnnotationLayer modelId="test-model" />
      </Canvas>
    );

    // Initial selector call count (should be small, 1-3 calls)
    const initialCallCount = selectorCallCount;

    // Force multiple re-renders to simulate React 18's concurrent rendering
    for (let i = 0; i < 5; i++) {
      act(() => {
        rerender(
          <Canvas>
            <AnnotationLayer modelId="test-model" />
          </Canvas>
        );
      });
    }

    // After multiple re-renders, the selector call count should not grow exponentially
    // We expect a small linear increase, not exponential growth
    expect(selectorCallCount).toBeLessThan(initialCallCount * 10);

    // With properly memoized selectors, the count should be very close to the initial count
    // plus one per re-render at most
    expect(selectorCallCount).toBeLessThanOrEqual(initialCallCount + 5);
  });

  // Additional test for our new multi-step selection approach
  it('uses stable selector for annotations to prevent useSyncExternalStore issues', () => {
    let selectorCallCount = 0;
    let stableRefUpdated = 0;

    // Create a mock implementation specifically for this test
    const mockStore = {
      annotations: {
        'annotation-1': { id: 'annotation-1', modelId: 'test-model' },
        'annotation-2': { id: 'annotation-2', modelId: 'test-model' }
      },
      isCreating: false,
      selectAnnotation: vi.fn(),
      getState: () => mockStore
    };

    // Track useEffect hook for stable ref updates
    const originalUseEffect = React.useEffect;
    React.useEffect = vi.fn().mockImplementation((callback, deps) => {
      if (deps && deps.length === 1 && Array.isArray(deps[0])) {
        stableRefUpdated++; // Count updates to the stableAnnotationIds ref
      }
      return originalUseEffect(callback, deps);
    });

    useAppStore.mockImplementation((selector, equalityFn) => {
      if (typeof selector === 'function') {
        selectorCallCount++;
        return selector(mockStore);
      }
      return mockStore;
    });

    // Render and re-render multiple times
    const { rerender } = render(
      <Canvas>
        <AnnotationLayer modelId="test-model" />
      </Canvas>
    );

    const initialSelectorCalls = selectorCallCount;

    // Force multiple re-renders
    for (let i = 0; i < 3; i++) {
      act(() => {
        rerender(
          <Canvas>
            <AnnotationLayer modelId="test-model" />
          </Canvas>
        );
      });
    }

    // Verify that the number of selector calls grows linearly, not exponentially
    const newSelectorCalls = selectorCallCount - initialSelectorCalls;
    expect(newSelectorCalls).toBeLessThanOrEqual(3); // At most one new call per re-render

    // Restore original useEffect
    React.useEffect = originalUseEffect;
  });
});