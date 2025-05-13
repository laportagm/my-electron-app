/**
 * Dedicated mock for React Three Fiber components
 * This is a separate mock to keep the React Three Fiber specific mocks
 * This allows us to use the mock in our tests without having to mock the entire Three.js library
 */
import React from 'react';
import { vi } from 'vitest';
import mockThree from './three-updated';

// Create a customized Canvas mock with proper event handler support
const createCanvasMock = () => {
  return vi.fn().mockImplementation(({ children, ...props }) => {
    // Create a handler object that will be accessible to tests via __handlers
    const handlers = {
      pointermove: vi.fn(),
      pointerdown: vi.fn(),
      pointerup: vi.fn(),
      click: vi.fn(),
    };

    // Find any mesh with pointer events in the children
    // This traverses the React children tree to find elements with onPointerMove
    const findPointerHandlers = (children) => {
      if (!children) return;

      if (Array.isArray(children)) {
        children.forEach(child => findPointerHandlers(child));
        return;
      }

      if (children && children.props) {
        if (children.props.onPointerMove) {
          handlers.pointermove = children.props.onPointerMove;
        }
        if (children.props.onPointerDown) {
          handlers.pointerdown = children.props.onPointerDown;
        }
        if (children.props.onPointerUp) {
          handlers.pointerup = children.props.onPointerUp;
        }
        if (children.props.onClick) {
          handlers.click = children.props.onClick;
        }

        // Recursively search children
        if (children.props.children) {
          findPointerHandlers(children.props.children);
        }
      }
    };

    // Attempt to find pointer handlers in children
    findPointerHandlers(children);

    // Create the Canvas element with the __handlers property
    const element = React.createElement('div', {
      'data-testid': 'mock-canvas',
      // Expose handlers directly as a property of the element
      __handlers: handlers,
      ...props
    }, children);

    // Return the element directly
    return element;
  });
};

// Create a scene mock with proper event handling
const createSceneMock = () => {
  return mockThree.Scene();
};

// Export a factory function that creates a fresh R3F mock
export const createR3FMock = () => {
  const CanvasMock = createCanvasMock();
  const mockScene = createSceneMock();
  
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
          removeEventListener: vi.fn(),
        }
      },
      size: { width: 800, height: 600 },
      viewport: { width: 800, height: 600 },
    }),
    useFrame: vi.fn().mockImplementation(callback => {
      // Call the callback once to simulate a frame
      callback({ clock: { getElapsedTime: () => 0 } }, 0.1);
    }),
    extend: vi.fn(),
  };
};

// Create mock components for JSX
const mockR3F = createR3FMock();

// Create the DOM elements for mocking R3F components
function createR3FElementMock(name) {
  // Create a non-validating custom element function
  // This prevents the React DOM validator from complaining about unknown attributes
  return vi.fn().mockImplementation(({ children, ...props }) => {
    // Create a span element with a data-testid for easier testing
    return React.createElement('span', {
      'data-testid': `mock-r3f-${name}`,
      'data-r3f-element': name,
      // Spread all props without validation
      ...props
    }, children || null);
  });
}

// Create mock HTML elements for all Three.js components used in R3F
// These are created to match the lowercase elements used in JSX
mockR3F.group = createR3FElementMock('group');
mockR3F.mesh = createR3FElementMock('mesh');
mockR3F.sphereGeometry = createR3FElementMock('sphereGeometry');
mockR3F.meshBasicMaterial = createR3FElementMock('meshBasicMaterial');
mockR3F.meshStandardMaterial = createR3FElementMock('meshStandardMaterial');
mockR3F.line = createR3FElementMock('line');
mockR3F.bufferGeometry = createR3FElementMock('bufferGeometry');
mockR3F.bufferAttribute = createR3FElementMock('bufferAttribute');
mockR3F.lineDashedMaterial = createR3FElementMock('lineDashedMaterial');
mockR3F.pointLight = createR3FElementMock('pointLight');

// Create PascalCase versions of components for compatibility
// These would normally be provided by the 'extend' function but we're adding them here for completeness
mockR3F.Group = mockR3F.group;
mockR3F.Mesh = mockR3F.mesh;
mockR3F.SphereGeometry = mockR3F.sphereGeometry;
mockR3F.MeshBasicMaterial = mockR3F.meshBasicMaterial;
mockR3F.MeshStandardMaterial = mockR3F.meshStandardMaterial;
mockR3F.Line = mockR3F.line;
mockR3F.BufferGeometry = mockR3F.bufferGeometry;
mockR3F.BufferAttribute = mockR3F.bufferAttribute;
mockR3F.LineDashedMaterial = mockR3F.lineDashedMaterial;
mockR3F.PointLight = mockR3F.pointLight;

// Export the extended instance
export default mockR3F;