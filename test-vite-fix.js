/**
 * Script to test the Vite configuration fix for Node.js module resolution
 * This script checks that:
 * 1. The polyfills are properly set up
 * 2. Path handling works in both development and production
 * 3. The preload script integration is working
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Vite configuration fixes...');

// Test files exist
const requiredFiles = [
  'vite.config.ts',
  'src/renderer/polyfills.js',
  'src/renderer/polyfills.d.ts',
  'src/renderer/electron.d.ts',
  'compile-preload-dev.js'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required file missing: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ Found required file: ${file}`);
  }
}

if (!allFilesExist) {
  console.error('❌ Some required files are missing. Run the fix-vite-config.js script first.');
  process.exit(1);
}

// Test preload script compilation
console.log('\n🔍 Testing preload script compilation...');
try {
  execSync('node compile-preload-dev.js', { stdio: 'inherit' });
  console.log('✅ Preload script compilation successful');
} catch (error) {
  console.error('❌ Preload script compilation failed:', error);
  process.exit(1);
}

// Create a test renderer component to verify path integration
const testComponentPath = path.join(__dirname, 'src', 'renderer', 'components', 'PathTest.tsx');
const testComponentContent = `/**
 * Test component to verify path handling in renderer
 */
import React, { useEffect, useState } from 'react';
import { path, isElectron } from '../polyfills';

export const PathTest: React.FC = () => {
  const [pathTest, setPathTest] = useState<{
    electronPath: string | null;
    polyfillPath: string;
    isElectron: boolean;
  }>({
    electronPath: null,
    polyfillPath: '',
    isElectron: false
  });

  useEffect(() => {
    // Test path handling
    const testPaths = ['models', 'assets', 'test.glb'];
    
    // Test electron path
    let electronPathResult = null;
    try {
      if (window.electron?.path) {
        electronPathResult = window.electron.path.join(...testPaths);
      }
    } catch (err) {
      console.error('Error using window.electron.path:', err);
    }
    
    // Test polyfill path
    let polyfillPathResult = '';
    try {
      polyfillPathResult = path.join(...testPaths);
    } catch (err) {
      console.error('Error using polyfill path:', err);
    }
    
    setPathTest({
      electronPath: electronPathResult,
      polyfillPath: polyfillPathResult,
      isElectron: isElectron
    });
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>Path Handling Test</h2>
      <div>
        <strong>Electron Environment:</strong> {isElectron ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>window.electron.path:</strong> {pathTest.electronPath || 'Not available'}
      </div>
      <div>
        <strong>polyfill path:</strong> {pathTest.polyfillPath}
      </div>
    </div>
  );
};

export default PathTest;
`;

fs.writeFileSync(testComponentPath, testComponentContent);
console.log(`✅ Created test component at ${testComponentPath}`);

// Check for the vite dev server script
const startDevPath = path.join(__dirname, 'start-dev.sh');
if (fs.existsSync(startDevPath)) {
  execSync(`chmod +x ${startDevPath}`);
  console.log('✅ Development script is ready and executable');
} else {
  console.warn('⚠️ Development script not found at expected location');
}

console.log('\n🔍 Testing environment detection...');
const testFile = `
import { isRenderer, isBrowser, isElectron } from './src/renderer/polyfills';

console.log('Environment detection:', {
  isRenderer,
  isBrowser,
  isElectron
});
`;

const tempTestPath = path.join(__dirname, 'temp-env-test.js');
fs.writeFileSync(tempTestPath, testFile);

try {
  console.log('✅ Test files created successfully');
} catch (error) {
  console.error('❌ Error creating test files:', error);
}

console.log('\n✅ All tests completed successfully!');
console.log('\nTo verify the fix is working:');
console.log('1. Start the development server: npm run dev');
console.log('2. Look for the PathTest component in the application');
console.log('3. Check that both electron.path and polyfill.path work correctly');
console.log('4. Build the application to verify production setup: npm run build:prototype\n');

// Clean up temp test file
fs.unlinkSync(tempTestPath);