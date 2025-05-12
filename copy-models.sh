#!/bin/bash

echo "=== Copying models directly to Vite's public directory ==="

# Create renderer assets directory (this is where Vite will look for files)
mkdir -p src/renderer/assets/models
mkdir -p src/renderer/draco

# Copy models directly (not symlinks) to ensure they're accessible
echo "Copying GLB files..."
cp -v public/assets/models/*.glb src/renderer/assets/models/

# Copy draco decoders directly
echo "Copying Draco decoders..."
cp -r public/draco/* src/renderer/draco/

# Create assets subdirectory in renderer directory
mkdir -p src/renderer/public
ln -sf ../assets src/renderer/public/assets
ln -sf ../draco src/renderer/public/draco

echo "=== Done! ==="
echo "Now run: npm run dev"
