/**
 * Creates a mock HTMLCanvasElement with full event handling support
 * This is useful for testing components that need to interact with canvas
 * elements, particularly when working with pointer events.
 */

// Type definitions to match the Canvas API
type CanvasContext = {
  measureText: (text: string) => { width: number };
  fillText: (text: string, x: number, y: number) => void;
  clearRect: (x: number, y: number, width: number, height: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  fill: () => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => void;
  [key: string]: any;
};

export type MockPointerEvent = {
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
  [key: string]: any;
};

export interface MockCanvasElement extends HTMLCanvasElement {
  __eventListeners: Map<string, Set<EventListener>>;
  __handlers: Record<string, (event: any) => void>;
  simulatePointerEvent: (type: string, event: Partial<MockPointerEvent>) => void;
}

// Mock sizes for the canvas
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * Creates a mock canvas element with full event handling capabilities
 * 
 * @param width - Canvas width (defaults to 800px)
 * @param height - Canvas height (defaults to 600px)
 * @returns A mock canvas element with event handling
 */
export function createMockCanvas(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT): MockCanvasElement {
  // Store event listeners in a map for each event type
  const eventListeners = new Map<string, Set<EventListener>>();
  
  // Create mock 2D context
  const context2d: CanvasContext = {
    measureText: (text: string) => ({ width: text.length * 5 }),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(width * height * 4) })),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createPattern: vi.fn(() => null),
    getContext: vi.fn(),
  };

  // Create handlers object for direct test access
  const handlers: Record<string, (event: any) => void> = {
    pointermove: vi.fn(),
    pointerdown: vi.fn(),
    pointerup: vi.fn(),
    pointerenter: vi.fn(),
    pointerleave: vi.fn(),
    pointerover: vi.fn(),
    pointerout: vi.fn(),
    pointercancel: vi.fn(),
    click: vi.fn(),
    dblclick: vi.fn(),
    contextmenu: vi.fn(),
    wheel: vi.fn(),
  };

  // Create the mock canvas element
  const mockCanvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
    },
    getBoundingClientRect: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => {}
    }),
    getContext: (contextId: string) => {
      if (contextId === '2d') {
        return context2d;
      }
      if (contextId === 'webgl' || contextId === 'webgl2') {
        // Return minimal WebGL context if needed
        return {
          canvas: mockCanvas,
          drawingBufferWidth: width,
          drawingBufferHeight: height,
          viewport: vi.fn(),
          clear: vi.fn(),
          clearColor: vi.fn(),
        };
      }
      return null;
    },
    
    // Event handling implementation
    addEventListener: (type: string, listener: EventListener) => {
      if (!eventListeners.has(type)) {
        eventListeners.set(type, new Set());
      }
      eventListeners.get(type)?.add(listener);
      
      // Also store directly in handlers for easy test access
      if (type in handlers) {
        handlers[type] = listener as (event: any) => void;
      }
    },
    
    removeEventListener: (type: string, listener: EventListener) => {
      if (eventListeners.has(type)) {
        eventListeners.get(type)?.delete(listener);
      }
    },
    
    dispatchEvent: (event: Event) => {
      const listeners = eventListeners.get(event.type);
      if (!listeners) return true;
      
      listeners.forEach(listener => {
        listener(event);
      });
      
      return !event.defaultPrevented;
    },
    
    // Method to simulate pointer events for testing
    simulatePointerEvent: (type: string, eventProps: Partial<MockPointerEvent>) => {
      const event = {
        type,
        target: mockCanvas,
        currentTarget: mockCanvas,
        bubbles: true,
        cancelable: true,
        defaultPrevented: false,
        preventDefault: vi.fn(() => { event.defaultPrevented = true; }),
        stopPropagation: vi.fn(),
        clientX: eventProps.clientX || 0,
        clientY: eventProps.clientY || 0,
        button: eventProps.button || 0,
        buttons: eventProps.buttons || 0,
        altKey: eventProps.altKey || false,
        ctrlKey: eventProps.ctrlKey || false,
        shiftKey: eventProps.shiftKey || false,
        metaKey: eventProps.metaKey || false,
        pageX: eventProps.pageX || eventProps.clientX || 0,
        pageY: eventProps.pageY || eventProps.clientY || 0,
        pointerId: eventProps.pointerId || 1,
        pointerType: eventProps.pointerType || 'mouse',
        isPrimary: eventProps.isPrimary !== undefined ? eventProps.isPrimary : true,
        ...eventProps
      };
      
      // Access the handler directly for immediate execution
      if (type in handlers && handlers[type]) {
        handlers[type](event);
      }
      
      // Also dispatch the event through normal channels
      mockCanvas.dispatchEvent(event as unknown as Event);
      
      return event;
    },
    
    // Expose for testing
    __eventListeners: eventListeners,
    __handlers: handlers
  } as unknown as MockCanvasElement;
  
  return mockCanvas;
}

/**
 * Patch document.createElement to return our mock canvas when 'canvas' tag is requested
 * This allows tests to intercept canvas creation without changing application code
 * 
 * @param canvasMock - Optional custom mock canvas instance to use
 * @returns A cleanup function to restore the original createElement
 */
export function patchDocumentCreateElement(canvasMock?: MockCanvasElement): () => void {
  const mockCanvas = canvasMock || createMockCanvas();
  const originalCreateElement = document.createElement;
  
  // Override createElement
  document.createElement = vi.fn((tagName: string, options?: ElementCreationOptions) => {
    if (tagName.toLowerCase() === 'canvas') {
      return mockCanvas;
    }
    return originalCreateElement.call(document, tagName, options);
  });
  
  // Return a cleanup function
  return () => {
    document.createElement = originalCreateElement;
  };
}

/**
 * Apply mock to an existing HTMLCanvasElement
 * Useful when you have a reference to a canvas but want to add mock capabilities
 * 
 * @param canvas - The canvas element to enhance
 * @returns The enhanced canvas with mock functionality
 */
export function enhanceCanvasWithMock(canvas: HTMLCanvasElement): MockCanvasElement {
  const mockCanvas = createMockCanvas(canvas.width, canvas.height);
  
  // Copy properties from mock to original
  Object.defineProperties(canvas, Object.getOwnPropertyDescriptors(mockCanvas));
  
  return canvas as MockCanvasElement;
}

// For Vitest compatibility
declare const vi: {
  fn: <T extends (...args: any[]) => any>(implementation?: T) => T;
};

export default createMockCanvas;