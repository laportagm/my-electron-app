/**
 * compile-preload-dev.js - Simplified preload script compiler
 *
 * This script compiles the preload.ts file for development with improved
 * reliability and error handling.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Compiling preload scripts for development...');

// Paths to main preload file
const mainPreloadPath = path.join(__dirname, 'src', 'main', 'preload.ts');

// Check if the main preload file exists
if (!fs.existsSync(mainPreloadPath)) {
  console.error(`❌ Error: ${mainPreloadPath} does not exist`);
  process.exit(1);
}

try {
  // Define a single tsconfig for preload compilation
  const preloadTsConfig = {
    compilerOptions: {
      target: "ES2018",
      module: "CommonJS", // CommonJS works reliably with Electron
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: path.join(__dirname, 'src', 'main'),
      strict: false,
      allowJs: true,
      resolveJsonModule: true,
      sourceMap: true,  // Generate source maps for debugging
    },
    include: [
      path.join(__dirname, 'src', 'main', 'preload.ts'),
      // Include other preload-related files, if any
      path.join(__dirname, 'src', 'main', 'preload', '*.ts')
    ],
    exclude: [
      "node_modules",
      "**/*.spec.ts"
    ]
  };

  // Write the tsconfig file
  const tsConfigPath = path.join(__dirname, 'preload-tsconfig.json');
  fs.writeFileSync(tsConfigPath, JSON.stringify(preloadTsConfig, null, 2));
  console.log(`✅ Created TypeScript config at ${tsConfigPath}`);

  // Compile all preload scripts at once
  console.log('🔄 Compiling preload scripts...');
  execSync(`npx tsc -p ${tsConfigPath}`, { stdio: 'inherit' });

  // Copy compiled JS files to the correct locations if needed
  const compiledMainPreload = path.join(__dirname, 'src', 'main', 'preload.js');
  if (fs.existsSync(compiledMainPreload)) {
    // Make sure the directory exists
    const preloadDir = path.join(__dirname, 'src', 'main', 'preload');
    if (!fs.existsSync(preloadDir)) {
      fs.mkdirSync(preloadDir, { recursive: true });
    }

    // Copy to preload directory for redundancy
    fs.copyFileSync(
      compiledMainPreload,
      path.join(preloadDir, 'preload.js')
    );

    console.log('✅ Preload scripts successfully compiled');
  } else {
    console.error('❌ Failed to find compiled preload.js file');
    process.exit(1);
  }

  // Don't remove the tsconfig file - keep it for reference and future builds
  console.log('✨ Preload compilation complete');
} catch (error) {
  console.error('❌ Error compiling preload scripts:', error);
  process.exit(1);
}