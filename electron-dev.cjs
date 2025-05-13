// Development entry point for Electron
// This allows running the app without building it first

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// We now use a pre-written CommonJS file instead of trying to compile at runtime
const path = require('path');
const mainDevJs = path.join(__dirname, 'src', 'main', 'main.dev.cjs');

try {
  console.log('Loading development main process from:', mainDevJs);
  require(mainDevJs);
} catch (error) {
  console.error('Failed to load development main process:', error);
  process.exit(1);
}