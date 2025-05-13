#!/bin/bash
# fix-asset-loading.sh
# Script to fix asset loading issues in the application

echo "Starting asset loading fix script..."

# Step 1: Create directory structure if missing
mkdir -p public/assets/models/high-poly
mkdir -p public/assets/models/low-poly
mkdir -p public/draco/gltf
mkdir -p src/renderer/public/assets/models

# Step 2: Check for existing Draco decoder files
echo "Checking Draco decoder availability..."
if [ ! -f "public/draco/gltf/draco_decoder.js" ]; then
  echo "Draco decoder files missing. Will attempt to download..."
  
  # Create a temporary directory
  mkdir -p temp_draco
  
  # Download Draco decoder files from Google CDN
  echo "Downloading Draco decoder files from CDN..."
  curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.js" -o temp_draco/draco_decoder.js
  curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.wasm" -o temp_draco/draco_decoder.wasm
  curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_wasm_wrapper.js" -o temp_draco/draco_wasm_wrapper.js
  
  # Check if download was successful
  if [ -f "temp_draco/draco_decoder.js" ]; then
    echo "Downloaded Draco files successfully."
    
    # Copy to needed locations
    cp temp_draco/* public/draco/
    cp temp_draco/* public/draco/gltf/
    cp -r public/draco src/renderer/public/
    
    echo "Installed Draco decoder files to multiple locations for compatibility."
  else
    echo "Failed to download Draco files. Please download them manually."
  fi
  
  # Clean up
  rm -rf temp_draco
else
  echo "Draco decoder files already present."
fi

# Step 3: Copy models to necessary locations for compatibility
echo "Setting up model file symlinks for compatibility..."

# Find all GLB files
glb_files=$(find public/assets/models -name "*.glb" -maxdepth 1)

if [ -z "$glb_files" ]; then
  echo "No model files found in public/assets/models."
else
  echo "Creating symlinks for model compatibility..."
  
  # For each GLB file, create symlinks in alternative locations
  for file in $glb_files; do
    filename=$(basename "$file")
    
    # Create symlinks in the low-poly directory
    if [ ! -e "public/assets/models/low-poly/$filename" ]; then
      ln -sf "../$filename" "public/assets/models/low-poly/$filename"
      echo "Created symlink: public/assets/models/low-poly/$filename"
    fi
    
    # Create symlinks in the renderer public directory
    if [ ! -e "src/renderer/public/assets/models/$filename" ]; then
      mkdir -p src/renderer/public/assets/models
      ln -sf "../../../../public/assets/models/$filename" "src/renderer/public/assets/models/$filename"
      echo "Created symlink: src/renderer/public/assets/models/$filename"
    fi
  done
fi

# Step 4: Create a utility file to verify asset availability
echo "Creating asset verification utility..."

cat > verify-assets.js << 'EOF'
/**
 * Asset Verification Utility
 * Run with: node verify-assets.js
 */
const fs = require('fs');
const path = require('path');

// Paths to check
const paths = [
  'public/assets/models',
  'public/assets/models/high-poly',
  'public/assets/models/low-poly',
  'public/draco',
  'public/draco/gltf',
  'src/renderer/public/assets/models'
];

// Files to check
const files = [
  'public/draco/draco_decoder.js',
  'public/draco/draco_decoder.wasm',
  'public/draco/gltf/draco_decoder.js',
  'public/draco/gltf/draco_decoder.wasm'
];

console.log('Asset Verification Report\n');

// Check directories
console.log('Directory Check:');
paths.forEach(dirPath => {
  try {
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(dirPath);
      console.log(`✅ ${dirPath} (${files.length} files)`);
    } else {
      console.log(`❌ ${dirPath} (Not a directory)`);
    }
  } catch (err) {
    console.log(`❌ ${dirPath} (Not found)`);
  }
});

console.log('\nKey File Check:');
files.forEach(filePath => {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      console.log(`✅ ${filePath} (${stat.size} bytes)`);
    } else {
      console.log(`❌ ${filePath} (Not a file)`);
    }
  } catch (err) {
    console.log(`❌ ${filePath} (Not found)`);
  }
});

// Check model files
const modelDir = 'public/assets/models';
try {
  console.log('\nModel Check:');
  const modelFiles = fs.readdirSync(modelDir)
    .filter(file => file.endsWith('.glb'));
  
  if (modelFiles.length === 0) {
    console.log('⚠️ No model files found. Application may not work properly.');
  } else {
    console.log(`✅ Found ${modelFiles.length} model files:`);
    modelFiles.forEach(file => {
      try {
        const lowPolyPath = path.join('public/assets/models/low-poly', file);
        const rendererPath = path.join('src/renderer/public/assets/models', file);
        
        const lowPolyExists = fs.existsSync(lowPolyPath);
        const rendererExists = fs.existsSync(rendererPath);
        
        console.log(`  ${file} (Low-poly: ${lowPolyExists ? '✅' : '❌'}, Renderer: ${rendererExists ? '✅' : '❌'})`);
      } catch (err) {
        console.log(`  ${file} (Error checking variants)`);
      }
    });
  }
} catch (err) {
  console.log('❌ Could not check model files:', err.message);
}

console.log('\nReport complete. If any items are marked with ❌, run fix-asset-loading.sh again.');
EOF

chmod +x verify-assets.js

# Step 5: Run the verification
echo "Running asset verification..."
node verify-assets.js

echo ""
echo "Asset loading fix script completed."
echo "If issues persist, please check the verification report above."
echo "You can run 'node verify-assets.js' at any time to verify your asset setup."
echo ""
echo "---------------------------------------------"
echo "IMPORTANT: To fully standardize asset loading, the following code changes are required:"
echo "1. Update BrainModel.tsx to use the new standardAssetLoader"
echo "2. Update any components that load models directly"
echo "3. Replace imports from loadModel.ts with standardAssetLoader.ts"
echo "---------------------------------------------"