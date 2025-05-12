#!/bin/bash
set -e

echo "Building minimal version without native modules..."

# Copy minimal main and preload to main.ts and preload.ts
cp src/main/main-minimal.ts src/main/main.ts
cp src/main/preload/preload-minimal.ts src/main/preload/preload.ts

# Build renderer
echo "Building renderer..."
npm run build:renderer

# Build electron main process
echo "Building electron main process..."
npx tsc

echo "Build completed successfully!"