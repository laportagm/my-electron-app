#!/usr/bin/env node

/**
 * Asset Verification Tool
 * 
 * This script verifies that all required 3D model assets exist in the correct
 * location and are accessible.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Model information from registry (hardcoded for this script)
const modelIds = [
  'Brain1', 'BrainstemNerves', 'BrainstenBasal', 'caudal-medulla', 
  'CrainialNerves', 'midbrain', 'pons', 'rostral-medulla',
  'SpinalNerves1', 'SpinalNerves2', 'SpinalNerves3', 'SpinalNerves4', 'SpinalNerves5', 'SpinalNerves6',
  'StriatumBasal-Left', 'StriatumBasal-Right', 'Thalamus-Basal', 'Tracts',
  'Visual-Pathway-skull', 'Visual-Pathway'
];

// Paths to check
const pathsToCheck = [
  'public/assets/models',
  'public/draco',
  'public/draco/gltf',
];

// Required Draco files
const requiredDracoFiles = [
  'draco_decoder.js',
  'draco_decoder.wasm',
  'draco_wasm_wrapper.js'
];

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
};

/**
 * Print a header
 */
function printHeader(text) {
  console.log('\n' + colors.bright + colors.cyan + '==== ' + text + ' ====' + colors.reset);
}

/**
 * Check if required directories exist
 */
function checkDirectories() {
  printHeader('Checking Required Directories');
  
  let allValid = true;
  
  for (const dir of pathsToCheck) {
    const fullPath = path.resolve(dir);
    
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        console.log(colors.green + '✓ ' + colors.reset + dir);
      } else {
        console.log(colors.red + '✗ ' + colors.reset + dir + ' (not a directory)');
        allValid = false;
      }
    } catch (error) {
      console.log(colors.red + '✗ ' + colors.reset + dir + ' (not found)');
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * Check if Draco decoder files exist
 */
function checkDracoFiles() {
  printHeader('Checking Draco Decoder Files');
  
  let allValid = true;
  const dracoPath = path.resolve('public/draco');
  const dracoGltfPath = path.resolve('public/draco/gltf');
  
  // Check main Draco files
  for (const file of requiredDracoFiles) {
    const fullPath = path.join(dracoPath, file);
    
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isFile()) {
        console.log(colors.green + '✓ ' + colors.reset + 'draco/' + file);
      } else {
        console.log(colors.red + '✗ ' + colors.reset + 'draco/' + file + ' (not a file)');
        allValid = false;
      }
    } catch (error) {
      console.log(colors.red + '✗ ' + colors.reset + 'draco/' + file + ' (not found)');
      allValid = false;
    }
  }
  
  // Check GLTF-specific Draco files
  try {
    const stats = fs.statSync(dracoGltfPath);
    if (stats.isDirectory()) {
      console.log(colors.green + '✓ ' + colors.reset + 'draco/gltf directory');
      
      // Check for required files in the gltf subdirectory
      for (const file of requiredDracoFiles) {
        const fullPath = path.join(dracoGltfPath, file);
        
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            console.log(colors.green + '✓ ' + colors.reset + 'draco/gltf/' + file);
          } else {
            console.log(colors.yellow + '! ' + colors.reset + 'draco/gltf/' + file + ' (not a file)');
          }
        } catch (error) {
          console.log(colors.yellow + '! ' + colors.reset + 'draco/gltf/' + file + ' (not found)');
        }
      }
    }
  } catch (error) {
    console.log(colors.yellow + '! ' + colors.reset + 'draco/gltf directory not found');
  }
  
  return allValid;
}

/**
 * Check if model files exist
 */
function checkModelFiles() {
  printHeader('Checking 3D Model Files');
  
  let allValid = true;
  const modelsPath = path.resolve('public/assets/models');
  
  // Get list of all .glb files
  let existingModels = [];
  try {
    const files = fs.readdirSync(modelsPath);
    existingModels = files.filter(file => file.endsWith('.glb'));
  } catch (error) {
    console.error(colors.red + 'Error reading models directory:' + colors.reset, error.message);
    return false;
  }
  
  console.log(colors.bright + 'Found ' + existingModels.length + ' model files' + colors.reset);
  
  // Check for each required model
  for (const id of modelIds) {
    const filename = id + '.glb';
    const fullPath = path.join(modelsPath, filename);
    
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isFile()) {
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(colors.green + '✓ ' + colors.reset + filename + colors.dim + ' (' + fileSizeMB + ' MB)' + colors.reset);
      } else {
        console.log(colors.red + '✗ ' + colors.reset + filename + ' (not a file)');
        allValid = false;
      }
    } catch (error) {
      console.log(colors.red + '✗ ' + colors.reset + filename + ' (not found)');
      allValid = false;
    }
  }
  
  // Check for additional model organizations (high/low poly)
  try {
    const highPolyDir = path.join(modelsPath, 'high-poly');
    const lowPolyDir = path.join(modelsPath, 'low-poly');
    
    if (fs.existsSync(highPolyDir) && fs.statSync(highPolyDir).isDirectory()) {
      console.log(colors.green + '✓ ' + colors.reset + 'high-poly directory exists');
    }
    
    if (fs.existsSync(lowPolyDir) && fs.statSync(lowPolyDir).isDirectory()) {
      console.log(colors.green + '✓ ' + colors.reset + 'low-poly directory exists');
    }
  } catch (error) {
    // Optional directories
  }
  
  return allValid;
}

/**
 * Main function
 */
function main() {
  console.log(colors.bright + colors.magenta + '\n🧠 BRAIN APP ASSET VERIFICATION TOOL 🧠\n' + colors.reset);
  
  // Check if we need to install chalk
  try {
    require.resolve('chalk');
  } catch (error) {
    console.log('Installing chalk for better output formatting...');
    try {
      execSync('npm install chalk --no-save', { stdio: 'inherit' });
      console.log('Chalk installed successfully');
    } catch (error) {
      console.log('Failed to install chalk, continuing with basic output');
    }
  }
  
  const directoriesValid = checkDirectories();
  const dracoFilesValid = checkDracoFiles();
  const modelFilesValid = checkModelFiles();
  
  printHeader('Verification Summary');
  
  if (directoriesValid && dracoFilesValid && modelFilesValid) {
    console.log(colors.bright + colors.green + '✅ All assets verified successfully!\n' + colors.reset);
    console.log('You can now start the application with: npm run dev');
    return 0;
  } else {
    console.log(colors.bright + colors.red + '❌ Some assets are missing or invalid!\n' + colors.reset);
    
    if (!directoriesValid) {
      console.log('- Required directories are missing. Run setup scripts to create them.');
    }
    
    if (!dracoFilesValid) {
      console.log('- Draco decoder files are missing. Run ./setup-draco.sh to fix this.');
    }
    
    if (!modelFilesValid) {
      console.log('- Some 3D model files are missing. Run ./setup-brain-models.sh to fix this.');
    }
    
    console.log('\nRun ./fix-all.sh to attempt to fix all issues automatically.');
    return 1;
  }
}

// Run the main function
process.exit(main());