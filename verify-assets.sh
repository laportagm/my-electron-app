#!/bin/bash

echo "=== Verifying Model Assets ==="

# Check if models directory exists in the public folder
if [ ! -d "/Users/gagelaporta/my-electron-app/public/assets/models" ]; then
  echo "Creating assets/models directory structure..."
  mkdir -p /Users/gagelaporta/my-electron-app/public/assets/models
fi

# Check if source models exist
if [ -d "/Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models" ]; then
  echo "Source models found. Copying to project..."
  cp -v /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/*.glb /Users/gagelaporta/my-electron-app/public/assets/models/
  
  # Verify models were copied
  COUNT=$(ls -1 /Users/gagelaporta/my-electron-app/public/assets/models/*.glb 2>/dev/null | wc -l)
  if [ $COUNT -gt 0 ]; then
    echo "✅ $COUNT model files copied successfully."
  else
    echo "❌ No model files were copied. Please check source path."
  fi
else
  echo "❌ Source models not found at /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models"
  echo "Please verify the path to your original models."
fi

# Set up Draco decoder
echo "Setting up Draco decoder..."
mkdir -p /Users/gagelaporta/my-electron-app/public/draco
if [ -d "/Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco" ]; then
  cp -r /Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco/* /Users/gagelaporta/my-electron-app/public/draco/
  echo "✅ Draco decoder copied successfully."
else
  echo "⚠️ Draco decoder not found in node_modules. Installing three.js..."
  npm install three
  if [ -d "/Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco" ]; then
    cp -r /Users/gagelaporta/my-electron-app/node_modules/three/examples/jsm/libs/draco/* /Users/gagelaporta/my-electron-app/public/draco/
    echo "✅ Draco decoder installed and copied."
  else
    echo "❌ Failed to install Draco decoder."
  fi
fi

echo "=== Creating Test File ==="
echo "Creating a test file to verify asset loading..."
cat > /Users/gagelaporta/my-electron-app/public/assets/models/test.json << EOL
{"test": "success"}
EOL

echo "=== Done ==="
echo "Run 'npm run dev' to start your application."
