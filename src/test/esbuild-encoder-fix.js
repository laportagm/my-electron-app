/**
 * ESBuild TextEncoder Compatibility Fix
 *
 * This module patches the TextEncoder implementation to ensure 
 * it properly returns Uint8Array instances that pass the instanceof check.
 * 
 * The issue occurs when mixing Node.js ESM and CommonJS environments,
 * especially in testing environments like Vitest with esbuild.
 * 
 * Usage:
 * 1. Import this file early in your test setup: import './esbuild-encoder-fix'
 * 2. Or require it in your esbuild/bundling scripts: require('./esbuild-encoder-fix')
 */

// Store the original TextEncoder implementation
const OriginalTextEncoder = globalThis.TextEncoder;

// Check if we need to patch (only patch if there's an issue)
const needsPatch = (() => {
  try {
    const encoder = new TextEncoder();
    const result = encoder.encode('');
    return !(result instanceof Uint8Array);
  } catch (err) {
    console.warn('Error testing TextEncoder compatibility:', err);
    // If there's an error, we'll try patching anyway
    return true;
  }
})();

if (needsPatch) {
  console.log('Applying TextEncoder compatibility patch for ESBuild/Vitest');
  
  // Create enhanced TextEncoder that ensures proper Uint8Array instances
  class FixedTextEncoder extends OriginalTextEncoder {
    encode(input) {
      const result = super.encode(input);
      
      // Ensure result is properly recognized as Uint8Array
      // by fixing its prototype chain if needed
      if (!(result instanceof Uint8Array)) {
        Object.setPrototypeOf(result, Uint8Array.prototype);
      }
      
      return result;
    }
    
    encodeInto(input, dest) {
      const result = super.encodeInto(input, dest);
      return result;
    }
  }
  
  // Replace the global TextEncoder with our fixed version
  globalThis.TextEncoder = FixedTextEncoder;
  
  // Verify the fix worked
  const verifyFix = () => {
    try {
      const encoder = new TextEncoder();
      const result = encoder.encode('');
      if (result instanceof Uint8Array) {
        console.log('TextEncoder patch successfully applied');
      } else {
        console.warn('TextEncoder patch failed - instances still not recognized as Uint8Array');
      }
    } catch (err) {
      console.warn('Error verifying TextEncoder patch:', err);
    }
  };
  
  // Run verification
  verifyFix();
} else {
  console.log('TextEncoder implementation is compatible, no patch needed');
}

// Export the patched TextEncoder
module.exports = globalThis.TextEncoder;