#!/usr/bin/env node

/**
 * wait-and-launch.js
 *
 * This script waits for the development server to be ready
 * before launching Electron.
 */

import waitOn from 'wait-on';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read configuration for port from package.json
let port = 5173; // Default port
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  // Extract port from dev:renderer script if it exists
  if (packageJson.scripts && packageJson.scripts['dev:renderer']) {
    const portMatch = packageJson.scripts['dev:renderer'].match(/--port\s+(\d+)/);
    if (portMatch && portMatch[1]) {
      port = parseInt(portMatch[1], 10);
    }
  }
} catch (err) {
  console.warn('Could not parse package.json to extract port, using default:', err.message);
}

// Build the development server URL with the determined port
const devUrl = `http://localhost:${port}`;

// Electron entry point - Ensure we're using the correct one
const electronEntryPoint = path.join(__dirname, 'src', 'main', 'main.dev.cjs');

// Check if the entry point exists
if (!fs.existsSync(electronEntryPoint)) {
  console.error(`❌ Electron entry point not found: ${electronEntryPoint}`);
  console.log('Searching for alternative entry points...');

  // Try to find alternative entry points
  const alternatives = [
    path.join(__dirname, 'src', 'main', 'main.dev.js'),
    path.join(__dirname, 'electron-dev.cjs'),
    path.join(__dirname, 'electron-dev.js')
  ];

  let foundAlternative = false;
  for (const alt of alternatives) {
    if (fs.existsSync(alt)) {
      console.log(`✅ Found alternative entry point: ${alt}`);
      foundAlternative = true;
      break;
    }
  }

  if (!foundAlternative) {
    console.error('❌ No valid entry point found. Please check your project structure.');
    process.exit(1);
  }
}

console.log('🔍 Waiting for development server to be ready...');
console.log(`   Checking URL: ${devUrl}`);

// Options for wait-on with better error handling
const options = {
  resources: [`${devUrl}/`], // Add trailing slash to ensure full URL
  interval: 1000, // Check every second
  timeout: 60000, // Timeout after 1 minute
  validateStatus: status => status !== 404, // Any status but 404 is OK
  log: true
};

// Wait for dev server to be ready
waitOn(options)
  .then(() => {
    console.log(`✅ Development server ready at ${devUrl}`);
    console.log(`🚀 Launching Electron...`);

    // Launch Electron with the development entry point
    const electronProcess = spawn('npx', ['electron', electronEntryPoint], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: devUrl, // Pass the working URL to Electron
        ELECTRON_DEV_PORT: port.toString() // Also pass port as a separate env var
      }
    });

    // Handle Electron process events
    electronProcess.on('error', (error) => {
      console.error(`❌ Error starting Electron:`, error);
    });

    electronProcess.on('close', (code) => {
      console.log(`Electron process exited with code ${code}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error waiting for development server:', error);
    console.log(`Try running "npm run dev:renderer" in a separate terminal window to start the dev server manually.`);
    process.exit(1);
  });
