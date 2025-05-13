#!/usr/bin/env node

/**
 * start-bundled.js
 *
 * Script to start the bundled Electron application
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define build modes
const MODE = process.env.NODE_ENV || 'development';
const isDev = MODE === 'development';

// Configure paths
const outDir = path.join(__dirname, isDev ? 'temp-dev-build' : 'dist');
const mainFile = isDev
  ? path.join(outDir, 'main.dev.js')
  : path.join(outDir, 'main.js');

// Check if the bundled file exists
if (!fs.existsSync(mainFile)) {
  console.error(`❌ Error: Bundled file not found at ${mainFile}`);
  console.error('Please run the bundling script first.');
  process.exit(1);
}

console.log(`🚀 Starting Electron with bundled main process (${MODE} mode)`);
console.log(`Using: ${mainFile}`);

// Start Electron with the bundled file
const electronProcess = spawn('npx', ['electron', mainFile], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: MODE,
  }
});

electronProcess.on('close', (code) => {
  console.log(`👋 Electron process exited with code ${code}`);
});