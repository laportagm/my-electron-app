import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Compiling preload script...');

try {
  // Use npx to run the local TypeScript compiler
  // Compile the preload.ts file directly to preload.js in src/main for development
  const preloadTs = path.join(__dirname, 'src', 'main', 'preload.ts');
  const outputDir = path.join(__dirname, 'src', 'main');
  
  // Make sure the preload file exists
  if (!fs.existsSync(preloadTs)) {
    throw new Error(`Preload file not found at ${preloadTs}`);
  }
  
  console.log(`Compiling ${preloadTs} to ${outputDir}...`);
  
  // Create a simple temporary tsconfig for the preload script
  const tempTsConfig = {
    compilerOptions: {
      target: "ES2018",
      module: "CommonJS",
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: outputDir,
      strict: false,
    },
    files: [preloadTs]
  };
  
  // Write the temporary tsconfig
  const tempTsConfigPath = path.join(__dirname, 'temp-preload-tsconfig.json');
  fs.writeFileSync(tempTsConfigPath, JSON.stringify(tempTsConfig, null, 2));
  
  // Run the TypeScript compiler using npx
  execSync(`npx tsc -p ${tempTsConfigPath}`, { stdio: 'inherit' });
  
  // Clean up the temporary tsconfig
  fs.unlinkSync(tempTsConfigPath);
  
  console.log('Preload script successfully compiled to:', path.join(outputDir, 'preload.js'));
} catch (error) {
  console.error('Error compiling preload script:', error);
  process.exit(1);
}