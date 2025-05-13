#!/usr/bin/env node

/**
 * bundle-main.js
 * 
 * Uses esbuild to bundle the main process TypeScript files into a single JavaScript file.
 * This is more efficient than using TypeScript's --outFile with AMD modules.
 */

import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Fix for TextEncoder issue in ESM environment
try {
  const encoder = new TextEncoder();
  const encoded = encoder.encode('');
  if (!(encoded instanceof Uint8Array)) {
    console.warn('Patching TextEncoder to fix esbuild Uint8Array issue');
    const OriginalTextEncoder = globalThis.TextEncoder;

    class FixedTextEncoder extends OriginalTextEncoder {
      encode(input) {
        const result = super.encode(input);
        // Make sure the result passes instanceof Uint8Array check
        if (!(result instanceof Uint8Array)) {
          Object.setPrototypeOf(result, Uint8Array.prototype);
        }
        return result;
      }
    }

    globalThis.TextEncoder = FixedTextEncoder;
  }
} catch (error) {
  console.warn('Error checking TextEncoder compatibility:', error);
}

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define build modes
const MODE = process.env.NODE_ENV || 'development';
const isDev = MODE === 'development';

// Configure paths
const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, isDev ? 'temp-dev-build' : 'dist');

// Create output directory if it doesn't exist
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// The file to bundle depends on the mode
const entryPoint = isDev 
  ? path.join(srcDir, 'main', 'main.dev.ts')
  : path.join(srcDir, 'main', 'main.ts');

const outFile = isDev
  ? path.join(outDir, 'main.dev.js')
  : path.join(outDir, 'main.js');

console.log(`🚀 Bundling main process for ${MODE} mode...`);
console.log(`Entry: ${entryPoint}`);
console.log(`Output: ${outFile}`);

// Run esbuild
try {
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outFile,
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    minify: !isDev,
    sourcemap: isDev,
    define: {
      'process.env.NODE_ENV': JSON.stringify(MODE),
    },
    external: [
      // Node built-ins
      'electron',
      'fs', 
      'path', 
      'os', 
      'http', 
      'https', 
      'crypto',
      // Any native modules should be listed here
      'better-sqlite3'
    ]
  });

  console.log(`✅ Bundle created successfully at ${outFile}`);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}