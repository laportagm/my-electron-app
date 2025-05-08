#!/bin/bash

echo "=== Setting up Draco decoder files ==="
mkdir -p public/draco
cp -R node_modules/three/examples/jsm/libs/draco/* public/draco/

echo "=== Fixing model paths and creating test models ==="

# Create some low-poly test models for development purposes
mkdir -p public/assets/models/low-poly
mkdir -p public/assets/models/high-poly

# Create symbolic links to the actual models if they exist
if [ -d "/Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models" ]; then
  echo "Creating optimized model references..."
  
  # For each model, create both a low-poly and high-poly reference (they point to the same file for now)
  for model in /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/*.glb; do
    basename=$(basename "$model")
    cp "$model" "public/assets/models/$basename"
    # For testing purposes, create duplicate references
    ln -sf "../$basename" "public/assets/models/low-poly/$basename"
    ln -sf "../$basename" "public/assets/models/high-poly/$basename"
  done
fi

echo "=== Creating model index file ==="
# Create a model index file for your application to reference
cat > public/assets/models/index.json << EOL
{
  "models": [
    {
      "id": "Brain1",
      "name": "Complete Brain",
      "lowUrl": "./assets/models/low-poly/Brain1.glb",
      "highUrl": "./assets/models/high-poly/Brain1.glb"
    },
    {
      "id": "BrainstemNerves",
      "name": "Brainstem Nerves",
      "lowUrl": "./assets/models/low-poly/BrainstemNerves.glb",
      "highUrl": "./assets/models/high-poly/BrainstemNerves.glb"
    },
    {
      "id": "midbrain",
      "name": "Midbrain",
      "lowUrl": "./assets/models/low-poly/midbrain.glb",
      "highUrl": "./assets/models/high-poly/midbrain.glb"
    }
  ]
}
EOL

echo "=== Rebuild and restart your application ==="
echo "Setup complete! Now run: npm run dev"
