// Simple script to test if our path.join fix works

// Import path module using ESM syntax
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing path.join functionality...');

try {
  // Test basic path.join
  const joinedPath = path.join('a', 'b', 'c');
  console.log('Path join works!', joinedPath);
  
  // Test with __dirname
  console.log('Current directory:', __dirname);
  const resolvedPath = path.resolve(__dirname, 'src', 'renderer');
  console.log('Resolved path:', resolvedPath);
  
  console.log('✅ Path utilities working correctly!');
} catch (err) {
  console.error('❌ Error when using path utilities:', err);
  process.exit(1);
}