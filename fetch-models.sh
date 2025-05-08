#!/bin/bash

echo "=== Setting up brain models ==="

# Create public assets directory structure
mkdir -p public/assets/models

# Copy models from desktop to public folder
echo "Copying brain models from desktop..."
cp -v /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/*.glb public/assets/models/

echo "=== Setting up Draco decoder ==="
# Make sure draco decoder is available
mkdir -p public/draco

# Copy Draco decoder from Three.js if available
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  cp -r node_modules/three/examples/jsm/libs/draco/* public/draco/
  echo "Draco decoder copied successfully."
else
  echo "Warning: Draco decoder not found. Please install Three.js with 'npm install three'."
fi

echo "=== Creating model test file ==="
# Create a test model for debugging
cat > public/assets/models/test-model.json << EOL
{
  "models": [
    {
      "id": "Brain1",
      "path": "Brain1.glb"
    },
    {
      "id": "midbrain",
      "path": "midbrain.glb"
    }
  ]
}
EOL

echo "=== Done! ==="
echo "Models copied to public/assets/models/"
echo "Run your app with: npm run dev"
