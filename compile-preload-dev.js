import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Compiling preload script for development...');

// Ensure the source preload.ts exists
const preloadTsPath = path.join(__dirname, 'src', 'main', 'preload.ts');
if (!fs.existsSync(preloadTsPath)) {
  console.error(`Error: ${preloadTsPath} does not exist`);
  process.exit(1);
}

try {
  // Create a temporary tsconfig specifically for preload
  const tempTsConfig = {
    compilerOptions: {
      target: "ES2018",
      module: "CommonJS",
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: path.join(__dirname, 'src', 'main'),
      strict: false,
    },
    files: [preloadTsPath]
  };

  // Write the temporary tsconfig
  const tempTsConfigPath = path.join(__dirname, 'temp-preload-dev-tsconfig.json');
  fs.writeFileSync(tempTsConfigPath, JSON.stringify(tempTsConfig, null, 2));

  // Compile the preload.ts file with CommonJS module format
  console.log('Compiling preload.ts to preload.js with CommonJS format...');
  execSync(`npx tsc -p ${tempTsConfigPath}`, { stdio: 'inherit' });

  // Clean up the temporary tsconfig
  fs.unlinkSync(tempTsConfigPath);

  console.log('Preload script successfully compiled');
} catch (error) {
  console.error('Error compiling preload script:', error);
  process.exit(1);
}