// Test script to validate TextEncoder fix
// Run with: node src/test/encoder-test.js

console.log('Testing TextEncoder implementation...');

// Create a TextEncoder instance
const encoder = new TextEncoder();

// Encode an empty string
const encoded = encoder.encode('');

// Check if the result is instanceof Uint8Array
const isUint8Array = encoded instanceof Uint8Array;

console.log('Encoded value:', encoded);
console.log('instanceof Uint8Array:', isUint8Array);

if (isUint8Array) {
  console.log('✅ TextEncoder returns a proper Uint8Array instance - test PASSED');
} else {
  console.log('❌ TextEncoder does NOT return a proper Uint8Array instance - test FAILED');
  console.log('This is likely what\'s causing the esbuild error');
}

// Additional debugging info
console.log('\nAdditional information:');
console.log('Prototype chain:',  
  Object.getPrototypeOf(encoded) === Uint8Array.prototype ? 
    'Correctly linked to Uint8Array.prototype' : 
    'NOT linked to Uint8Array.prototype');
console.log('Constructor:', encoded.constructor.name);