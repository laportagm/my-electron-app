// Development entry point for Electron
// This allows running the app without building it first

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Get the main.ts file
const mainPath = path.join(__dirname, 'src', 'main', 'main.ts');

// Use ts-node to run the TypeScript main file directly
require('ts-node').register({
  transpileOnly: true
});

// Now require the file (which will be compiled on-the-fly)
require(mainPath);