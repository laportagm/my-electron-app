#!/bin/bash

# Exit on error
set -e

echo "📦 Rebuilding the application with CSP and ThemeToggle fixes..."

# Clean build directories to ensure a fresh build
echo "🧹 Cleaning build artifacts..."
rm -rf dist

# Make sure the scripts directory exists for convert-to-cjs.js
mkdir -p dist/main-es

# Run the prebuild script to set up any prerequisites
echo "🔧 Running prebuild setup..."
if [ -f "./build-prep.sh" ]; then
  chmod +x ./build-prep.sh
  ./build-prep.sh
fi

# Build the renderer with Vite (skip TypeScript compilation for renderer)
echo "🔨 Building renderer..."
npm run build:renderer

# Build the electron main process step by step to catch errors
echo "🔨 Building electron main process..."
echo "  - Compiling TypeScript to ES modules..."
npx tsc -p tsconfig.json --outDir dist/main-es
echo "  - Fixing ES modules..."
npx tsc-esm-fix --target='dist/main-es/**/*.js'
echo "  - Converting to CommonJS..."
node scripts/convert-to-cjs.js

# Preload script is already created in dist/main
echo "🔨 Using precompiled preload script..."
mkdir -p dist/main
# File is already created at dist/main/preload.js

echo "✅ Build completed successfully! You can now run the app with 'npm start'"