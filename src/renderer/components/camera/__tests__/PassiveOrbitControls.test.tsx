import { vi, describe, it, expect } from 'vitest';

describe('PassiveOrbitControls document.createElement mock', () => {
  it('should properly mock document.createElement', () => {
    // Create a mock element that tracks event options
    const eventOptions: Record<string, any> = {};
    
    // Create a simple mock element
    const mockElement = {
      addEventListener: vi.fn((type, listener, options) => {
        eventOptions[type] = options;
      }),
      removeEventListener: vi.fn(),
      style: {}
    };
    
    // Setup the mock using the requested pattern
    vi.spyOn(document, 'createElement').mockImplementation(() => mockElement as any);
    
    // Create an element using the mocked method
    const element = document.createElement('canvas');
    
    // Verify that our mock was called and returned
    expect(element).toBe(mockElement);
    
    // Simulate the pattern used in the component by overriding addEventListener
    const originalAddEventListener = element.addEventListener;
    
    // Create a wrapper that forces wheel events to be passive
    const addEventListenerWrapper = function(type: string, listener: any, options: any) {
      if (type === 'wheel' || type === 'mousewheel') {
        const passiveOptions = { 
          ...(typeof options === 'object' ? options : {}), 
          passive: true 
        };
        return originalAddEventListener.call(this, type, listener, passiveOptions);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Replace the addEventListener with our wrapper
    element.addEventListener = addEventListenerWrapper;
    
    // Test a non-wheel event - Should keep options as is
    element.addEventListener('click', () => {}, { passive: false });
    expect(eventOptions.click).toEqual({ passive: false });
    
    // Test a wheel event - Should override to passive: true
    element.addEventListener('wheel', () => {}, { passive: false });
    expect(eventOptions.wheel).toEqual(expect.objectContaining({ passive: true }));
  });
});