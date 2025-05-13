// Development entry point for Electron
// This allows running the app without building it first

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Reference our dedicated tsconfig
const tsConfigPath = path.join(__dirname, 'tsconfig.dev-main.json');
const mainDevTs = path.join(__dirname, 'src', 'main', 'main.dev.ts');
const outputDir = path.join(__dirname, 'temp-dev-build');

try {
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Compile TS to JS using our dedicated tsconfig
  console.log('Compiling main.dev.ts for development using tsconfig:', tsConfigPath);
  execSync(`npx tsc -p ${tsConfigPath}`, {
    stdio: 'inherit'
  });

  // The output location is defined in the tsconfig
  const expectedOutputPath = path.join(outputDir, 'src', 'main', 'main.dev.js');
  
  console.log('Checking for compiled file at:', expectedOutputPath);
  
  // Check if file exists at expected location
  if (fs.existsSync(expectedOutputPath)) {
    console.log('Found compiled file at expected location');
    compiledPath = expectedOutputPath;
  } else {
    console.error('Compiled file not found at expected location');
    console.log('Attempting to list output directory contents:');
    execSync(`find ${outputDir} -type f -name "*.js"`, { stdio: 'inherit' });
    
    // Try to find the file with a more focused search
    const searchCommand = `find ${outputDir} -type f -name "main.dev.js"`;
    console.log('Running search command:', searchCommand);
    
    try {
      const findResults = execSync(searchCommand, { encoding: 'utf8' }).trim();
      
      if (findResults) {
        compiledPath = findResults.split('\n')[0];
        console.log('Found compiled file at:', compiledPath);
      } else {
        throw new Error('Could not find compiled main.dev.js file');
      }
    } catch (searchError) {
      console.error('Error searching for compiled file:', searchError);
      throw new Error('Could not locate the compiled main.dev.js file');
    }
  }

  // Now that we have a CJS version, we can require it
  console.log('Loading compiled main development module:', compiledPath);
  require(compiledPath);
} catch (error) {
  console.error('Failed to compile or require development main process:', error);
  process.exit(1);
} finally {
  // Clean up temp files on exit
  process.on('exit', () => {
    try {
      // Clean up the output directory
      if (fs.existsSync(outputDir)) {
        execSync(`rm -rf ${outputDir}`);
      }
    } catch (e) {
      console.error('Error cleaning up temp files:', e);
    }
  });
}