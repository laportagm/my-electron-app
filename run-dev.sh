#!/bin/bash

echo "🚀 Starting development environment..."

# 1. Compile the preload script
echo "⚙️ Compiling preload script..."
node compile-preload-dev.js

# 2. Build our development version for faster startup
echo "📦 Setting up development bundle..."
NODE_ENV=development npx vite build --mode development

# 3. Clean up any previous temp files
if [ -f "temp-main-dev.cjs" ]; then
  rm temp-main-dev.cjs
fi

# 4. Run electron with the development entry point
echo "🔌 Starting Electron..."
NODE_ENV=development npx electron electron-dev.cjs

# 5. Clean up temp files
if [ -f "temp-main-dev.cjs" ]; then
  rm temp-main-dev.cjs
fi

echo "✅ Development session complete"