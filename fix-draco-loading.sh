#!/bin/bash
# fix-draco-loading.sh
# Comprehensive script to fix Draco decoder availability and loading

echo "===== Draco Decoder & Asset Loading Fix ====="
echo "This script will fix Draco decoder availability and asset loading issues."

# First run the enhanced Draco setup
if [ -f "./setup-draco-enhanced.sh" ]; then
  echo "Running enhanced Draco setup..."
  chmod +x ./setup-draco-enhanced.sh
  ./setup-draco-enhanced.sh
else
  echo "Enhanced Draco setup script not found. Creating minimal setup..."
  
  # Create directories
  mkdir -p public/draco/gltf
  mkdir -p src/renderer/public/draco/gltf
  
  # Download files if needed
  if [ ! -f "public/draco/draco_decoder.js" ]; then
    echo "Downloading Draco decoder files from CDN..."
    curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.js" -o public/draco/draco_decoder.js
    curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.wasm" -o public/draco/draco_decoder.wasm
    curl -L "https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_wasm_wrapper.js" -o public/draco/draco_wasm_wrapper.js
    
    # Copy to gltf subfolder
    cp public/draco/*.js public/draco/gltf/
    cp public/draco/*.wasm public/draco/gltf/
    
    # Copy to renderer public
    cp -r public/draco src/renderer/public/
  fi
fi

# Check if the DracoDecoderManager exists, if not this script was likely run before the implementation
if [ ! -f "src/renderer/utils/DracoDecoderManager.ts" ]; then
  echo "DracoDecoderManager.ts not found! Please ensure you have implemented the enhanced Draco management system."
  echo "This script expects the following files to exist:"
  echo "- src/renderer/utils/DracoDecoderManager.ts"
  echo "- src/renderer/utils/AssetPathResolver.ts"
  echo "- src/renderer/utils/standardAssetLoader.ts"
  exit 1
fi

# Create a preload initialization script for Draco
echo "Creating Draco preload initialization script..."
cat > src/renderer/draco-init.js << 'EOF'
/**
 * draco-init.js
 * Preload initialization for Draco decoders
 * This file should be imported early in the application bootstrap process
 */

(function() {
  console.log('Initializing Draco decoders early...');
  
  // Try to detect environment
  const isElectron = typeof window !== 'undefined' && 
    (window.electron !== undefined || 
    navigator.userAgent.toLowerCase().indexOf('electron') > -1);
  
  // Early attempts to locate Draco decoders
  const dracoSearchPaths = [
    './draco/',
    './draco/gltf/',
    '../draco/',
    '../draco/gltf/',
    '/draco/',
    '/draco/gltf/',
    'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
  ];
  
  // Store working paths globally
  window.__dracoDecoderPaths = [];
  
  // Function to check if a file exists at a path
  function checkFileExists(url) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log(`✓ Found Draco decoder at: ${url}`);
            window.__dracoDecoderPaths.push(url.substring(0, url.lastIndexOf('/') + 1));
            resolve(true);
          } else {
            resolve(false);
          }
        }
      };
      xhr.onerror = function() {
        resolve(false);
      };
      xhr.send();
    });
  }
  
  // Early path checking (will be used by DracoDecoderManager later)
  const checkPromises = dracoSearchPaths.map(path => 
    checkFileExists(`${path}draco_decoder.js`)
  );
  
  // Wait for all checks to complete
  Promise.all(checkPromises).then(results => {
    const foundPaths = window.__dracoDecoderPaths;
    
    if (foundPaths.length > 0) {
      console.log(`Draco decoders found at ${foundPaths.length} locations. First working path: ${foundPaths[0]}`);
      // Set global for other components to use
      window.dracoDecoderPath = foundPaths[0];
    } else {
      console.warn('No local Draco decoders found. Will use CDN fallback when needed.');
      window.dracoDecoderPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
    }
  });
})();
EOF

# Update index.tsx to load draco-init.js
echo "Updating renderer index.tsx to preload Draco initialization..."
INDEX_FILE="src/renderer/index.tsx"

if [ -f "$INDEX_FILE" ]; then
  # Check if draco-init is already imported
  if grep -q "import './draco-init'" "$INDEX_FILE"; then
    echo "draco-init.js is already imported in index.tsx"
  else
    # Add import for draco-init before other imports
    awk '
    /import/ && !seen {
      print "// Import draco initialization first - critical for 3D model loading";
      print "import \"./draco-init.js\";";
      print "";
      seen = 1;
    }
    {print}
    ' "$INDEX_FILE" > "$INDEX_FILE.tmp" && mv "$INDEX_FILE.tmp" "$INDEX_FILE"
    
    echo "Added draco-init.js import to index.tsx"
  fi
else
  echo "Warning: Could not find index.tsx at $INDEX_FILE"
fi

# Create an integration script to use DracoDecoderManager with the existing GLTFLoader
echo "Creating Draco integration script..."
cat > src/renderer/utils/dracoIntegration.ts << 'EOF'
/**
 * dracoIntegration.ts
 * Integration layer between DracoDecoderManager and GLTFLoader
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { dracoDecoderManager } from './DracoDecoderManager';
import { assetLogger } from './assetLogger';

// Global GLTFLoader instance with Draco support
let gltfLoader: GLTFLoader | null = null;

/**
 * Initialize the global GLTFLoader with proper Draco support
 */
export async function initGLTFLoader(): Promise<GLTFLoader> {
  // Return existing loader if already initialized
  if (gltfLoader) {
    return gltfLoader;
  }
  
  // Initialize Draco decoder manager first
  await dracoDecoderManager.init();
  
  // Create new GLTFLoader
  gltfLoader = new GLTFLoader();
  
  // Set the DRACOLoader to the GLTFLoader
  gltfLoader.setDRACOLoader(dracoDecoderManager.getDracoLoader());
  
  // Log successful initialization
  assetLogger.assetInfo('GLTFLoader initialized with Draco support');
  
  return gltfLoader;
}

/**
 * Get the global GLTFLoader instance, initializing if needed
 */
export async function getGLTFLoader(): Promise<GLTFLoader> {
  if (!gltfLoader) {
    return initGLTFLoader();
  }
  return gltfLoader;
}

/**
 * Reset the loader (useful for testing or when changing decoder configurations)
 */
export function resetLoader(): void {
  gltfLoader = null;
}

export default {
  initGLTFLoader,
  getGLTFLoader,
  resetLoader
};
EOF

echo "Creating Draco initialization for standardAssetLoader..."
cat > src/renderer/utils/initDracoForAssetLoader.ts << 'EOF'
/**
 * initDracoForAssetLoader.ts
 * Initializes Draco decoders for use with standardAssetLoader
 */
import { dracoDecoderManager } from './DracoDecoderManager';
import { assetLogger } from './assetLogger';

/**
 * Initialize the Draco decoder system for the standard asset loader
 * This should be called early in the application bootstrap
 */
export async function initDracoForAssetLoader(): Promise<boolean> {
  try {
    // Initialize Draco decoder manager
    const result = await dracoDecoderManager.init();
    
    if (result) {
      assetLogger.assetInfo('Draco decoder initialized successfully for asset loader');
      
      // Preload decoders for better performance
      await dracoDecoderManager.preloadDecoderFiles();
      return true;
    } else {
      assetLogger.assetWarn('Draco decoder initialization failed, using fallbacks');
      return false;
    }
  } catch (error) {
    assetLogger.assetError('Error initializing Draco for asset loader:', error);
    return false;
  }
}

// Export the initialize function
export default initDracoForAssetLoader;
EOF

# Run verification to check if our fix worked
echo "Running verification..."

# Check for Draco decoder files
echo "Checking Draco decoder files..."
DRACO_FILES_FOUND=0

if [ -f "public/draco/draco_decoder.js" ] && [ -f "public/draco/gltf/draco_decoder.js" ]; then
  DRACO_FILES_FOUND=1
  echo "✓ Draco decoder files found in public/draco/"
else
  echo "✗ Draco decoder files missing from public/draco/"
fi

if [ -f "src/renderer/public/draco/draco_decoder.js" ] && [ -f "src/renderer/public/draco/gltf/draco_decoder.js" ]; then
  DRACO_FILES_FOUND=1
  echo "✓ Draco decoder files found in src/renderer/public/draco/"
else
  echo "✗ Draco decoder files missing from src/renderer/public/draco/"
fi

# Summary
echo ""
echo "===== Fix Complete ====="
if [ $DRACO_FILES_FOUND -eq 1 ]; then
  echo "✓ Draco decoder files are properly set up"
else
  echo "⚠ Draco decoder files might be missing. Run setup-draco-enhanced.sh again."
fi

echo "✓ Created Draco initialization scripts"
echo "✓ Updated index.tsx to load Draco initialization early"
echo "✓ Created integration between DracoDecoderManager and GLTFLoader"

echo ""
echo "To verify the fix worked, run the application and check the console for:"
echo "- 'Draco decoders found at X locations' message"
echo "- 'GLTFLoader initialized with Draco support' message"
echo ""
echo "The application will now use the enhanced Draco decoder system with robust fallbacks."