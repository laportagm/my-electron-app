#!/bin/bash

# Uninstall old tailwind packages
npm uninstall tailwind tailwindcss @tailwindcss/vite @tailwindcss/postcss

# Install the correct versions for Tailwind v4
npm install tailwindcss@latest @tailwindcss/postcss --save-dev

# Create necessary directories for Tailwind config
mkdir -p public/draco

# Copy the Draco decoder if three.js is installed
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  cp -R node_modules/three/examples/jsm/libs/draco public/
fi

echo "Installation complete! Now run: npm run dev"
