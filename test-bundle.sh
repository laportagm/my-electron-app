#!/bin/bash

# Test bundling for development
echo "🚀 Testing esbuild bundling for development..."

# Compile the main process using esbuild
NODE_ENV=development node bundle-main.js

# Check if the bundling was successful
if [ $? -ne 0 ]; then
  echo "❌ Bundling failed!"
  exit 1
fi

# Check if the output file exists
if [ ! -f "./temp-dev-build/main.dev.js" ]; then
  echo "❌ Output file doesn't exist!"
  exit 1
fi

echo "✅ Bundling successful!"
echo "ℹ️  You can run the bundled app with: npm run dev:bundle"

# Clean up
echo "🧹 Cleaning up..."
rm -rf ./temp-dev-build

echo "Done!"