# Three.js Mock Implementation Report

## Overview

This report details the implementation and results of adding proper event handling to the Three.js mock objects used in testing.

## Changes Made

1. Created a centralized `EventDispatcherMock` class to handle event management
2. Implemented proper event listener storage and dispatching
3. Modified the Object3D mock to use this event system
4. Created factory functions for common Three.js objects that inherit from Object3D
5. Added childadded/childremoved events that get dispatched when children are added/removed
6. Updated the React Three Fiber mock in setup.ts to use our new Scene mock

## Results

### Test Results

- **AnnotationLayer.test.tsx**: ✅ All 5 tests now pass
  - Fixed the "scene.addEventListener is not a function" error
  - Successfully handles event-related functionality

- **PointerMoveOptimization.test.tsx**: ❌ Still failing
  - These tests use a different approach with `canvasWrapper.__handlers.pointermove`
  - This requires a separate fix for the Canvas mock component

### Benefits

1. **Centralized Event Handling**: All Object3D-derived objects now have consistent event handling
2. **Proper Event Dispatching**: Events are correctly dispatched when objects are added/removed
3. **TypeScript Safe**: All mock implementations are properly typed
4. **Maintained Compatibility**: Existing mock functionality is preserved

## Remaining Issues

1. **Canvas Event Handling**: Tests that directly access `__handlers` on the mocked canvas still fail

2. **React Warning Messages**: Some React warnings about non-DOM properties appear:
   ```
   Warning: The tag <group> is unrecognized in this browser.
   Warning: Received `false` for a non-boolean attribute `visible`.
   ```
   These are expected when rendering Three.js components in a Jest DOM environment.

3. **Test-specific Mocks**: Some tests still have their own mocks defined in the test files instead of using the centralized mock.

## Recommendations

1. **Standardize Event Handler Mock**: Update the Canvas mock to properly handle event registration via `__handlers`.

2. **Clean Up Test-specific Mocks**: Refactor other test files to use the centralized mock.

3. **Suppress Expected Warnings**: Add test configuration to suppress the expected React warnings about custom component properties.

4. **Document Mock Usage**: Create documentation for how to properly use the mock in tests, especially for events.

## Implementation Details

The core of the implementation is the `EventDispatcherMock` class that handles event management:

```typescript
class EventDispatcherMock {
  private _listeners: Map<string, EventListener[]> = new Map();

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    const listeners = this._listeners.get(type)!;
    if (!listeners.includes(listener)) {
      listeners.push(listener);
    }
  }

  hasEventListener(type: string, listener: EventListener): boolean {
    const listeners = this._listeners.get(type);
    return listeners !== undefined && listeners.includes(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this._listeners.get(type);
    if (listeners !== undefined) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this._listeners.delete(type);
      }
    }
  }

  dispatchEvent(event: { type: string, [key: string]: any }): void {
    const listeners = this._listeners.get(event.type);
    if (listeners !== undefined) {
      // Make a copy to avoid issues if listeners are removed during dispatch
      const listenersCopy = [...listeners];
      for (const listener of listenersCopy) {
        listener(event);
      }
    }
  }
}
```

This implementation mirrors Three.js's actual EventDispatcher pattern and properly handles event registration, removal, and dispatching.