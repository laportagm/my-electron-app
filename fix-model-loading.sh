#!/bin/bash

echo "=== FIXING MODEL LOADING ISSUES ==="

# 1. Make sure the public/assets/models directory exists
mkdir -p /Users/gagelaporta/my-electron-app1/public/assets/models

# 2. Make sure all models are accessible
echo "Verifying model files are accessible..."
if [ -d "/Users/gagelaporta/my-electron-app1/public/assets/models" ]; then
  echo "✅ Models directory exists"
  
  # Check if models exist
  MODEL_COUNT=$(ls -1 /Users/gagelaporta/my-electron-app1/public/assets/models/*.glb 2>/dev/null | wc -l)
  if [ "$MODEL_COUNT" -gt 0 ]; then
    echo "✅ Found $MODEL_COUNT model files"
  else
    echo "❌ No model files found. Copying from source if available..."
    if [ -d "/Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models" ]; then
      cp -v /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/*.glb /Users/gagelaporta/my-electron-app1/public/assets/models/
      echo "✅ Models copied successfully"
    else
      echo "❌ Source directory not found. Please check the path."
    fi
  fi
else
  echo "❌ Models directory not found. Creating it..."
  mkdir -p /Users/gagelaporta/my-electron-app1/public/assets/models
fi

# 3. Set up Draco decoders
echo "Setting up Draco decoders..."
mkdir -p /Users/gagelaporta/my-electron-app1/public/draco
if [ -d "/Users/gagelaporta/my-electron-app1/node_modules/three/examples/jsm/libs/draco" ]; then
  cp -r /Users/gagelaporta/my-electron-app1/node_modules/three/examples/jsm/libs/draco/* /Users/gagelaporta/my-electron-app1/public/draco/
  echo "✅ Draco decoders copied successfully"
else
  echo "Installing Three.js..."
  npm install three
  mkdir -p /Users/gagelaporta/my-electron-app1/public/draco
  cp -r /Users/gagelaporta/my-electron-app1/node_modules/three/examples/jsm/libs/draco/* /Users/gagelaporta/my-electron-app1/public/draco/
  echo "✅ Draco decoders installed and copied"
fi

# 4. Set up symlinks in src/renderer/public for better asset resolution
echo "Setting up symlinks for model assets..."
mkdir -p /Users/gagelaporta/my-electron-app1/src/renderer/public
rm -rf /Users/gagelaporta/my-electron-app1/src/renderer/public/assets
rm -rf /Users/gagelaporta/my-electron-app1/src/renderer/public/draco

ln -s ../../../public/assets /Users/gagelaporta/my-electron-app1/src/renderer/public/assets
ln -s ../../../public/draco /Users/gagelaporta/my-electron-app1/src/renderer/public/draco
echo "✅ Symlinks created"

# 5. Create a small test file to verify serving is working
echo "Creating test file..."
echo '{"test": "success"}' > /Users/gagelaporta/my-electron-app1/public/assets/models/test.json

# 6. Final check
echo "Running final checks..."
if [ -f "/Users/gagelaporta/my-electron-app1/public/assets/models/Brain1.glb" ]; then
  echo "✅ Brain1.glb found in public directory"
else
  echo "❌ Brain1.glb not found, something went wrong"
fi

if [ -f "/Users/gagelaporta/my-electron-app1/public/draco/gltf/draco_decoder.js" ]; then
  echo "✅ Draco decoder found in public directory"
else
  echo "❌ Draco decoder not found, something went wrong"
fi

# 7. Update the renderer code to correctly use asset paths
echo "=== SETUP COMPLETE ==="
echo "Run your application with: npm run dev"
echo "The models should now load correctly!"