#!/bin/bash
# fix-path-resolution.sh
# Script to fix path resolution issues in Electron app

echo "Starting path resolution fix script..."

# Step 1: Make sure we have the right TypeScript configuration
echo "Updating TypeScript configurations..."
if grep -q "src/renderer/types" ./tsconfig.renderer.json; then
  echo "TypeScript config already updated for global types."
else
  echo "Updating TypeScript config to include global types..."
  # If jq is not available, we'll recommend manual editing
  if command -v jq >/dev/null 2>&1; then
    # Use jq to update the config
    jq '.compilerOptions.typeRoots = ["node_modules/@types", "src/renderer/types"]' ./tsconfig.renderer.json > tsconfig.renderer.tmp
    jq '.files = ["src/renderer/types/global.d.ts"]' ./tsconfig.renderer.tmp > tsconfig.renderer.json
    rm tsconfig.renderer.tmp
  else
    echo "Please add the following to your tsconfig.renderer.json compilerOptions:"
    echo "  \"typeRoots\": [\"node_modules/@types\", \"src/renderer/types\"]"
    echo "And add under the root of the config:"
    echo "  \"files\": [\"src/renderer/types/global.d.ts\"]"
  fi
fi

# Step 2: Make sure the necessary files exist
echo "Checking for required files..."

declare -a REQUIRED_FILES=(
  "src/renderer/polyfills.js"
  "src/renderer/electron.js"
  "src/renderer/utils/pathUtils.ts"
  "src/renderer/types/global.d.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f $file ]]; then
    echo "Missing required file: $file"
    echo "Please restore this file from the source code."
  else
    echo "Found required file: $file"
  fi
done

# Step 3: Ensure index.tsx imports polyfills first
echo "Checking if index.tsx imports polyfills first..."
if grep -q "import './polyfills.js'" ./src/renderer/index.tsx; then
  echo "index.tsx already imports polyfills."
else
  echo "WARNING: Add the following import as the FIRST import in src/renderer/index.tsx:"
  echo "import './polyfills.js';"
  echo "Fix required: Add polyfills import to index.tsx"
fi

# Step 4: Create directory for types if it doesn't exist
if [[ ! -d src/renderer/types ]]; then
  echo "Creating types directory..."
  mkdir -p src/renderer/types
  echo "Types directory created."
fi

# Step 5: Make sure the script is executable
chmod +x "fix-path-resolution.sh"
echo "Made fix-path-resolution.sh executable."

# Step 6: Update documentation
if grep -q "path.join is not a function" ./docs/global-memory-bank/tags/index.json; then
  echo "Documentation already includes path resolution fixes."
else
  echo "Updating documentation to include path resolution fixes..."
  echo "Please add a reference to path resolution fixes in your documentation."
fi

echo "Path resolution fix script completed."
echo ""
echo "To prevent 'path.join is not a function' errors:"
echo "1. Always import polyfills.js FIRST in your entry point"
echo "2. Always use window.electron.path instead of importing 'path' directly"
echo "3. Or use the pathUtils.ts module which has fallbacks for all environments"
echo "4. For inline paths, use: window.path.join() instead of path.join()"
echo ""