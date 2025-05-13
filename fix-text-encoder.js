#!/usr/bin/env node

/**
 * Fix TextEncoder issue with esbuild and ESM modules
 * 
 * This script patches the necessary files to fix the 
 * "Invariant violation: 'new TextEncoder().encode("")' instanceof Uint8Array is incorrectly false"
 * error that occurs when using esbuild with ESM modules.
 * 
 * The issue is due to the way TextEncoder.encode() returns a Uint8Array instance
 * that doesn't correctly pass the instanceof check in mixed ESM/CommonJS environments.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to files that need to be updated
const TEST_SETUP_PATH = path.join(__dirname, 'src', 'test', 'setup.ts');
const VITEST_CONFIG_PATH = path.join(__dirname, 'vitest.config.ts');

// TextEncoder fix implementation
const TEXT_ENCODER_FIX = `
// Fix TextEncoder and TextDecoder issue with instanceof
// This is necessary because esbuild requires TextEncoder to return true for instanceof Uint8Array
class FixedTextEncoder extends TextEncoder {
  encode(input?: string): Uint8Array {
    const result = super.encode(input);
    // Ensure result properly passes instanceof checks
    Object.setPrototypeOf(result, Uint8Array.prototype);
    return result;
  }
}

// Replace global TextEncoder with fixed version
global.TextEncoder = FixedTextEncoder;
`;

// Create esbuild-encoder-fix.js if it doesn't exist
const ENCODER_FIX_PATH = path.join(__dirname, 'src', 'test', 'esbuild-encoder-fix.js');
const ENCODER_FIX_CONTENT = `/**
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
`;

if (!fs.existsSync(ENCODER_FIX_PATH)) {
  console.log(`Creating TextEncoder fix at ${ENCODER_FIX_PATH}`);
  fs.writeFileSync(ENCODER_FIX_PATH, ENCODER_FIX_CONTENT);
}

// Update test setup file to use the fix
console.log(`Updating test setup file ${TEST_SETUP_PATH}`);
let setupContent = fs.readFileSync(TEST_SETUP_PATH, 'utf8');

// Check if we need to add the fix
if (!setupContent.includes('TextEncoder') && !setupContent.includes('esbuild-encoder-fix')) {
  // Add import for the fix
  setupContent = setupContent.replace(
    /^(import .+)$/m,
    `// Import TextEncoder fix first\nimport './esbuild-encoder-fix';\n\n$1`
  );
  
  // Add the fix directly as well for redundancy
  setupContent = setupContent + '\n' + TEXT_ENCODER_FIX;
  
  fs.writeFileSync(TEST_SETUP_PATH, setupContent);
  console.log('Added TextEncoder fix to test setup file');
} else {
  console.log('TextEncoder fix already exists in test setup file');
}

// Create a new vitest.config.updated.ts with the fix
console.log('Creating updated Vitest configuration file');
const UPDATED_VITEST_CONFIG_PATH = path.join(__dirname, 'vitest.config.updated.ts');
let vitestContent = fs.readFileSync(VITEST_CONFIG_PATH, 'utf8');

if (!vitestContent.includes('esbuild-encoder-fix')) {
  // Add import for the fix
  vitestContent = vitestContent.replace(
    /import { defineConfig } from 'vitest\/config'/,
    `import { defineConfig } from 'vitest/config'\n// Import TextEncoder fix to ensure it runs early\nimport './src/test/esbuild-encoder-fix'`
  );
  
  // Change setup file to setup-updated.ts
  vitestContent = vitestContent.replace(
    /setupFiles: '.\/src\/test\/setup.ts'/,
    `setupFiles: './src/test/setup-updated.ts'`
  );
  
  // Add TextEncoder messages to the log filter
  vitestContent = vitestContent.replace(
    /log.includes\('Using fallback model'\)/,
    `log.includes('Using fallback model') ||\n        \n        // TextEncoder patch messages\n        log.includes('TextEncoder compatibility') ||\n        log.includes('Applying TextEncoder') ||\n        log.includes('TextEncoder patch')`
  );
  
  fs.writeFileSync(UPDATED_VITEST_CONFIG_PATH, vitestContent);
  console.log(`Created updated Vitest configuration at ${UPDATED_VITEST_CONFIG_PATH}`);
}

// Update bundle-main.js if not already updated
const BUNDLE_MAIN_PATH = path.join(__dirname, 'bundle-main.js');
let bundleContent = fs.readFileSync(BUNDLE_MAIN_PATH, 'utf8');

if (!bundleContent.includes('TextEncoder')) {
  console.log('Updating bundle-main.js with TextEncoder fix');
  
  // Add the fix at the beginning of the file
  bundleContent = bundleContent.replace(
    /import fs from ['"]fs['"];/,
    `import fs from 'fs';\n\n// Fix for TextEncoder issue in ESM environment\ntry {\n  const encoder = new TextEncoder();\n  const encoded = encoder.encode('');\n  if (!(encoded instanceof Uint8Array)) {\n    console.warn('Patching TextEncoder to fix esbuild Uint8Array issue');\n    const OriginalTextEncoder = globalThis.TextEncoder;\n    \n    class FixedTextEncoder extends OriginalTextEncoder {\n      encode(input) {\n        const result = super.encode(input);\n        // Make sure the result passes instanceof Uint8Array check\n        if (!(result instanceof Uint8Array)) {\n          Object.setPrototypeOf(result, Uint8Array.prototype);\n        }\n        return result;\n      }\n    }\n    \n    globalThis.TextEncoder = FixedTextEncoder;\n  }\n} catch (error) {\n  console.warn('Error checking TextEncoder compatibility:', error);\n}`
  );
  
  fs.writeFileSync(BUNDLE_MAIN_PATH, bundleContent);
  console.log('Updated bundle-main.js with TextEncoder fix');
}

// Create a duplicate setup file with fixes applied
const SETUP_UPDATED_PATH = path.join(__dirname, 'src', 'test', 'setup-updated.ts');
if (!fs.existsSync(SETUP_UPDATED_PATH)) {
  console.log(`Creating updated setup file at ${SETUP_UPDATED_PATH}`);
  let updatedSetupContent = setupContent.replace(
    /^\/\/ Setup file for Vitest testing environment/,
    '// Setup file for Vitest testing environment with TextEncoder fix'
  );
  
  // Add import if needed
  if (!updatedSetupContent.includes('esbuild-encoder-fix')) {
    updatedSetupContent = updatedSetupContent.replace(
      /^(import .+)$/m,
      `// Import the TextEncoder fix first to ensure it's applied\nimport './esbuild-encoder-fix';\n\n$1`
    );
  }
  
  fs.writeFileSync(SETUP_UPDATED_PATH, updatedSetupContent);
  console.log('Created updated setup file with TextEncoder fix');
}

console.log('\nTextEncoder fix applied successfully!');
console.log('\nTo use the fix:');
console.log('1. Run tests with updated configuration:');
console.log('   npm run test -- --config vitest.config.updated.ts');
console.log('2. If it works, replace the original vitest.config.ts with the updated version');

// Create a verification test file
const ENCODER_TEST_PATH = path.join(__dirname, 'src', 'test', 'encoder-test.js');
if (!fs.existsSync(ENCODER_TEST_PATH)) {
  console.log(`Creating encoder test file at ${ENCODER_TEST_PATH}`);
  const ENCODER_TEST_CONTENT = `// Test script to validate TextEncoder fix
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
  console.log('This is likely what\\'s causing the esbuild error');
}

// Additional debugging info
console.log('\\nAdditional information:');
console.log('Prototype chain:',  
  Object.getPrototypeOf(encoded) === Uint8Array.prototype ? 
    'Correctly linked to Uint8Array.prototype' : 
    'NOT linked to Uint8Array.prototype');
console.log('Constructor:', encoded.constructor.name);`;
  
  fs.writeFileSync(ENCODER_TEST_PATH, ENCODER_TEST_CONTENT);
  console.log('Created encoder test file');
}