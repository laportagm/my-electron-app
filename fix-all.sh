#!/bin/bash

echo "=== Fixing Tailwind CSS issues ==="

# Remove Tailwind v4 packages
npm uninstall tailwindcss @tailwindcss/postcss

# Install Tailwind CSS v3 and its dependencies
npm install tailwindcss@3.3.3 postcss@8.4.31 autoprefixer@10.4.16 --save-dev

# Install required compression decoders for 3D models
npm install three@latest

# Create directories for draco decoders
mkdir -p public/draco
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  cp -R node_modules/three/examples/jsm/libs/draco public/
fi

# Directory for model assets
mkdir -p public/assets/models

# Copy any existing models if needed
if [ -d "/Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models" ]; then
  echo "Copying brain models from Desktop..."
  cp -R /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/* public/assets/models/
fi

echo "Installation complete! Now run: npm run dev"
