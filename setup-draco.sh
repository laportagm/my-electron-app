#!/bin/bash

echo "Setting up Draco decoder files..."

# Check if three.js is installed and copy Draco files
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  mkdir -p public/draco
  cp -R node_modules/three/examples/jsm/libs/draco/* public/draco/
  echo "Draco decoder files copied to public/draco/"
else
  echo "Error: Three.js not found. Please run 'npm install three' first."
  exit 1
fi

echo "Setup complete!"
