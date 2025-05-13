# Canvas Mock Implementation for Testing

## Overview

This document describes the implementation of a reusable mock HTMLCanvasElement for testing components that use canvas and pointer events, particularly for React Three Fiber applications.

## Problem

When testing 3D components that use React Three Fiber (R3F) and Three.js, several challenges arise:

1. **Canvas Interactions**: Components often rely on pointer events on the canvas element which are hard to simulate in a JSDOM environment.
2. **Event Propagation**: R3F handles event propagation in a custom way that's difficult to mock.
3. **Inconsistent Mocking**: Ad-hoc mocks in individual test files lead to inconsistent behavior.
4. **Redundant Code**: Similar mocking logic gets duplicated across test files.

## Solution

We implemented a comprehensive `createMockCanvas` utility that:

1. Creates a reusable, standalone mock of HTMLCanvasElement with full event handling
2. Provides helper methods to simulate pointer events
3. Exposes event handlers for direct testing
4. Can be patched into `document.createElement` for transparent usage

## Implementation

The implementation consists of two main files:

### 1. `src/test/utils/createMockCanvas.ts`

This file provides:

- `createMockCanvas()`: Creates a mock canvas with event handling
- `patchDocumentCreateElement()`: Patches document.createElement to return the mock
- `enhanceCanvasWithMock()`: Enhances an existing canvas element with mock functionality

Key features:

```typescript
// Create a mock canvas
const mockCanvas = createMockCanvas(800, 600);

// Add event listeners (just like a real canvas)
mockCanvas.addEventListener('pointermove', (e) => {
  // Handle event
});

// Simulate events in tests
mockCanvas.simulatePointerEvent('pointermove', {
  clientX: 400,
  clientY: 300
});

// Access handlers directly for verification
expect(mockCanvas.__handlers.pointermove).toHaveBeenCalled();
```

### 2. Updated Test Files (e.g., `PointerMoveOptimization.test.tsx`)

The test files use the mock canvas through a custom render function:

```typescript
function renderWithMockCanvas() {
  // Create and patch the mock
  const mockCanvas = createMockCanvas();
  const cleanupPatch = patchDocumentCreateElement(mockCanvas);
  
  // Render the component
  const rendered = render(<Component />);
  
  // Return helpers
  return { 
    // ...rendered utils
    mockCanvas,
    simulatePointerMove: (eventProps) => {
      // Simplified event simulation
      mockCanvas.simulatePointerEvent('pointermove', eventProps);
    },
    cleanup: () => {
      rendered.unmount();
      cleanupPatch();  // Restore original document.createElement
    }
  };
}
```

## Benefits

1. **Reusability**: The mock can be reused across many test files
2. **Consistency**: All tests use the same canvas mock implementation
3. **Simplicity**: Tests become clearer and focus on assertions rather than mocking
4. **Completeness**: The mock implements all relevant canvas methods
5. **Cleanup**: Tests properly restore the global environment

## Usage Examples

### Basic Usage

```typescript
import { createMockCanvas } from '../test/utils/createMockCanvas';

describe('Canvas Component', () => {
  it('handles pointer events', () => {
    const canvas = createMockCanvas();
    
    // Add a spy to track event handling
    const handlePointerMove = vi.fn();
    canvas.addEventListener('pointermove', handlePointerMove);
    
    // Simulate a pointer move event
    canvas.simulatePointerEvent('pointermove', { clientX: 100, clientY: 200 });
    
    // Verify the handler was called
    expect(handlePointerMove).toHaveBeenCalled();
  });
});
```

### With Component Rendering

```typescript
import { renderWithMockCanvas } from '../test/utils/testing-helpers';

describe('Interactive Component', () => {
  it('responds to user interactions', () => {
    const { simulatePointerMove, cleanup } = renderWithMockCanvas();
    
    // Simulate user interaction
    simulatePointerMove({ clientX: 400, clientY: 300 });
    
    // Verify component state or behavior
    // ...
    
    // Clean up
    cleanup();
  });
});
```

## Future Improvements

1. **WebGL Context Mocking**: Enhance WebGL context simulation for more complex canvas tests
2. **Gesture Support**: Add support for complex gestures like pinch-zoom and rotate
3. **Event Bubbling**: Improve event bubbling simulation
4. **Performance Metrics**: Add utilities to test canvas performance
5. **Integration with Testing Libraries**: Create adapters for popular testing libraries

## Conclusion

The MockCanvas implementation provides a robust solution for testing canvas-based components, especially those using React Three Fiber. By centralizing the canvas mocking logic, we've improved test consistency and reduced redundancy across the test suite.

The approach successfully addresses the challenges of testing components that rely on the canvas API and pointer events, making it easier to write comprehensive tests for our 3D visualization features.