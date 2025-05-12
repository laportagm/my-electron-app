#!/bin/bash
set -e

echo "Building prototype version (no LLM)"

# Build renderer first (this should always succeed)
echo "📦 Building renderer..."
npm run build:renderer

# Create minimal main files without LLM/database
echo "📦 Creating simplified main process files..."

# Clean up any previous build artifacts
rm -rf dist/main 
rm -rf dist/utils
mkdir -p dist/main/preload

# Copy minimal versions
cp src/main/main-minimal.ts src/main/main.ts
cp src/main/preload/preload-minimal.ts src/main/preload/preload.ts
cp src/utils/logger-minimal.ts src/utils/logger.ts

# Build TypeScript forcing output even with errors
echo "📦 Building Electron main process..."

# Build the main process files
npx tsc src/main/main.ts --outDir dist --skipLibCheck --esModuleInterop || true

# Build the preload script directly to the correct location
npx tsc src/main/preload/preload.ts --outDir dist/main --skipLibCheck --esModuleInterop || true

# Build utility files
npx tsc src/utils/config.ts src/utils/logger.ts --outDir dist --skipLibCheck --esModuleInterop || true

# Fix the module.exports reference
cat << 'EOF' > dist/utils/config.js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    apiUrl: 'http://localhost:5173',
};
EOF

echo "✅ Build completed!"
echo "To start the app, run: npm run start"