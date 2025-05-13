#!/bin/bash
# Enhanced Draco Decoder Setup Script
# This script ensures Draco decoders are correctly set up across all environments.

echo "==== Enhanced Draco Decoder Setup ===="
echo "Setting up Draco decoders with multiple fallback mechanisms..."

# Create all necessary directories
mkdir -p public/draco
mkdir -p public/draco/gltf
mkdir -p src/renderer/public/draco
mkdir -p src/renderer/public/draco/gltf

# Check if three.js is installed and extract Draco files
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  echo "Found Draco decoders in Three.js package"
  
  # Copy files to both standard and gltf folders
  echo "Copying standard Draco decoders..."
  cp -R node_modules/three/examples/jsm/libs/draco/* public/draco/
  
  # Copy gltf-specific files
  echo "Copying gltf-specific Draco decoders..."
  if [ -d "node_modules/three/examples/jsm/libs/draco/gltf" ]; then
    cp -R node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/gltf/
  else
    # If no gltf subfolder, copy standard files to gltf folder
    cp -R node_modules/three/examples/jsm/libs/draco/*.js public/draco/gltf/
    cp -R node_modules/three/examples/jsm/libs/draco/*.wasm public/draco/gltf/
  fi
  
  echo "Copying Draco decoders to renderer public directory..."
  cp -R public/draco src/renderer/public/
  
  echo "✓ Successfully copied Draco decoders from Three.js package"
else
  echo "⚠ Three.js package not found. Trying to download from CDN..."
  
  # Create a temporary directory for downloads
  mkdir -p temp_draco
  
  # Try to download Draco decoder files from CDN
  echo "Downloading Draco decoder files from Google CDN..."
  curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.js" -o temp_draco/draco_decoder.js
  curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.wasm" -o temp_draco/draco_decoder.wasm
  curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_wasm_wrapper.js" -o temp_draco/draco_wasm_wrapper.js
  
  # Check if download was successful
  if [ -f "temp_draco/draco_decoder.js" ]; then
    echo "✓ Downloaded Draco files from CDN successfully"
    
    # Copy to all required locations
    cp temp_draco/* public/draco/
    cp temp_draco/* public/draco/gltf/
    cp -r public/draco src/renderer/public/
    
    echo "✓ Installed Draco decoder files to all required locations"
  else
    echo "✗ Failed to download Draco files from CDN"
    echo "Attempting to find Draco files in existing directories..."
    
    # Look for Draco files in existing directories
    FOUND_DRACO=false
    
    # Check release directory
    if [ -d "release" ]; then
      echo "Checking release directory for Draco decoders..."
      DRACO_FILES=$(find release -name "draco_decoder.js" | head -1)
      
      if [ -n "$DRACO_FILES" ]; then
        DRACO_DIR=$(dirname "$DRACO_FILES")
        echo "Found Draco decoders in: $DRACO_DIR"
        cp "$DRACO_DIR"/*.js public/draco/
        cp "$DRACO_DIR"/*.wasm public/draco/ 2>/dev/null || true
        cp "$DRACO_DIR"/*.js public/draco/gltf/
        cp "$DRACO_DIR"/*.wasm public/draco/gltf/ 2>/dev/null || true
        cp -r public/draco src/renderer/public/
        FOUND_DRACO=true
        echo "✓ Copied existing Draco files from release directory"
      fi
    fi
    
    # If still not found, check dist directory
    if [ "$FOUND_DRACO" = false ] && [ -d "dist" ]; then
      echo "Checking dist directory for Draco decoders..."
      DRACO_FILES=$(find dist -name "draco_decoder.js" | head -1)
      
      if [ -n "$DRACO_FILES" ]; then
        DRACO_DIR=$(dirname "$DRACO_FILES")
        echo "Found Draco decoders in: $DRACO_DIR"
        cp "$DRACO_DIR"/*.js public/draco/
        cp "$DRACO_DIR"/*.wasm public/draco/ 2>/dev/null || true
        cp "$DRACO_DIR"/*.js public/draco/gltf/
        cp "$DRACO_DIR"/*.wasm public/draco/gltf/ 2>/dev/null || true
        cp -r public/draco src/renderer/public/
        FOUND_DRACO=true
        echo "✓ Copied existing Draco files from dist directory"
      fi
    fi
    
    # If still not found, create placeholder files
    if [ "$FOUND_DRACO" = false ]; then
      echo "⚠ Could not find Draco decoder files in any location"
      echo "Creating placeholder files to prevent runtime errors..."
      
      # Create minimal placeholder for draco_decoder.js
      echo "// Draco decoder placeholder - will be replaced with CDN version at runtime" > public/draco/draco_decoder.js
      echo "// Draco decoder placeholder - will be replaced with CDN version at runtime" > public/draco/gltf/draco_decoder.js
      
      # Create empty WASM file
      touch public/draco/draco_decoder.wasm
      touch public/draco/gltf/draco_decoder.wasm
      
      # Copy placeholders to renderer public directory
      cp -r public/draco src/renderer/public/
      
      echo "✓ Created placeholder Draco decoder files"
      echo "  ⚠ The application will attempt to use CDN fallback at runtime"
    fi
  fi
  
  # Clean up temp directory
  rm -rf temp_draco
fi

# Verify files are in place
echo "Verifying Draco decoder files..."
if [ -f "public/draco/draco_decoder.js" ] && [ -f "public/draco/gltf/draco_decoder.js" ]; then
  echo "✓ Standard Draco decoder files verified"
else
  echo "✗ Standard Draco decoder files missing"
fi

if [ -f "src/renderer/public/draco/draco_decoder.js" ] && [ -f "src/renderer/public/draco/gltf/draco_decoder.js" ]; then
  echo "✓ Renderer public Draco decoder files verified"
else
  echo "✗ Renderer public Draco decoder files missing"
fi

# Create README file for Draco directory
echo "Creating README file for Draco directory..."
cat > public/draco/README.md << 'EOF'
# Draco 3D Data Compression

Draco is an open-source library for compressing and decompressing 3D geometric meshes and point clouds. It is intended to improve the storage and transmission of 3D graphics.

[Website](https://google.github.io/draco/) | [GitHub](https://github.com/google/draco)

## Contents

This folder contains three utilities:

* `draco_decoder.js` — Emscripten-compiled decoder, compatible with any modern browser.
* `draco_decoder.wasm` — WebAssembly decoder, compatible with newer browsers and devices.
* `draco_wasm_wrapper.js` — JavaScript wrapper for the WASM decoder.

Each file is provided in two variations:

* **Default:** Latest stable builds, tracking the project's [master branch](https://github.com/google/draco).
* **glTF:** Builds targeted by the [glTF mesh compression extension](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression), tracking the [corresponding Draco branch](https://github.com/google/draco/tree/gltf_2.0_draco_extension).

Either variation may be used with `THREE.DRACOLoader`:

```js
var dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('path/to/decoders/');
dracoLoader.setDecoderConfig({type: 'js'}); // (Optional) Override detection of WASM support.
```

Further [documentation on GitHub](https://github.com/google/draco/tree/master/javascript/example#static-loading-javascript-decoder).

## Fallback Mechanism

This application implements a robust fallback mechanism that will automatically:

1. Try to load local Draco decoders from multiple locations
2. Fall back to Google CDN if local decoders are unavailable
3. Provide graceful error handling if decoders cannot be loaded

## License

[Apache License 2.0](https://github.com/google/draco/blob/master/LICENSE)
EOF

echo "==== Draco Setup Complete ===="
echo "To ensure optimal performance with Three.js:"
echo "1. The DracoDecoderManager will automatically locate and configure decoders at runtime"
echo "2. If local decoders fail, a CDN fallback will be used"
echo "3. WASM decoders will be used when supported for better performance"
echo ""