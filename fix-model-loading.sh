#!/bin/bash

echo "=== FIXING MODEL LOADING ISSUES ==="

# 1. Make sure the public/assets/models directory exists
mkdir -p /Users/gagelaporta/my-electron-app/public/assets/models

# 2. Copy all models from source to public folder
echo "Copying models from source location..."
if [ -d "/Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models" ]; then
  cp -v /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/*.glb /Users/gagelaporta/my-electron-app/public/assets/models/
  echo "✅ Models copied successfully"
else
  echo "❌ Source directory not found. Please check the path."
  exit 1
fi

# 3. Set up Draco decoders
echo "Setting up Draco decoders..."
mkdir -p /Users/gagelaporta/my-electron-app/public/draco
if [ -d "/Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco" ]; then
  cp -r /Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco/* /Users/gagelaporta/my-electron-app/public/draco/
else
  echo "Installing Three.js..."
  npm install three
  mkdir -p /Users/gagelaporta/my-electron-app/public/draco
  cp -r /Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco/* /Users/gagelaporta/my-electron-app/public/draco/
fi

# 4. Create a small test file to verify serving is working
echo "Creating test file..."
echo '{"test": "success"}' > /Users/gagelaporta/my-electron-app/public/assets/models/test.json

# 5. Install missing dependencies
echo "Installing dependencies..."
npm install three @vitejs/plugin-react react react-dom react-router-dom

# 6. Start the application
echo "=== SETUP COMPLETE ==="
echo "Run your application with: npm run dev"
echo "The models should now load correctly!"
