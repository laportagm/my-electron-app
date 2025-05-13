#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting development environment...');

// 1. First compile the preload script
console.log('Compiling preload script...');
try {
  await import('./compile-preload.js');
} catch (error) {
  console.error('Failed to compile preload script:', error);
  process.exit(1);
}

// 2. Start Vite dev server
console.log('Starting Vite dev server...');
const viteProcess = spawn('npx', ['vite', '--port', '5173'], { 
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Give Vite time to start
console.log('Waiting for Vite server to start...');
await new Promise(resolve => setTimeout(resolve, 3000));

// 3. Start Electron
console.log('Starting Electron...');
// Use npx to ensure electron is found in node_modules
const electronProcess = spawn('npx', ['electron', 'electron-dev.cjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down development environment...');
  viteProcess.kill();
  electronProcess.kill();
  process.exit(0);
});

// Handle child process exits
viteProcess.on('exit', (code) => {
  console.log(`Vite process exited with code ${code}`);
  electronProcess.kill();
  process.exit(code);
});

electronProcess.on('exit', (code) => {
  console.log(`Electron process exited with code ${code}`);
  viteProcess.kill();
  process.exit(code);
});