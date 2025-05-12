#!/bin/bash

# Comprehensive script to fix all model loading issues
# This script will:
# 1. Setup Draco decoders correctly in the public directory
# 2. Copy models to the correct locations
# 3. Fix symbolic links and ensure proper file structure

echo "🔧 Starting comprehensive model fix script..."

# Setup Draco decoders
echo "📥 Setting up Draco decoders..."
if [ -d "public/draco" ]; then
  echo "✅ Draco directory exists"
else
  echo "Creating Draco directory..."
  mkdir -p public/draco
  mkdir -p public/draco/gltf
fi

# Check if draco_decoder.js exists in node_modules
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  echo "Copying Draco decoders from Three.js..."
  cp -r node_modules/three/examples/jsm/libs/draco/* public/draco/
  cp -r node_modules/three/examples/jsm/libs/draco/* public/draco/gltf/
  echo "✅ Draco decoders copied successfully"
else
  echo "⚠️ Draco decoders not found in node_modules, downloading from CDN..."
  
  # Download from CDN if not available in node_modules
  curl -o public/draco/draco_decoder.js https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.js
  curl -o public/draco/draco_decoder.wasm https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.wasm
  curl -o public/draco/draco_wasm_wrapper.js https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_wasm_wrapper.js
  
  # Copy to gltf subfolder as well
  cp public/draco/draco_decoder.js public/draco/gltf/
  cp public/draco/draco_decoder.wasm public/draco/gltf/
  cp public/draco/draco_wasm_wrapper.js public/draco/gltf/
  
  echo "✅ Draco decoders downloaded from CDN"
fi

# Setup models directory structure
echo "📁 Setting up model directory structure..."

# Create directories if they don't exist
mkdir -p public/assets/models
mkdir -p public/assets/models/low-poly
mkdir -p public/assets/models/high-poly

# Copy models from source to public directory
echo "📋 Copying models to public directory..."

# Check if models exist in the original location
if [ -d "public/assets/models" ] && [ "$(ls -A public/assets/models)" ]; then
  echo "✅ Models already exist in public/assets/models"
  
  # Make sure we have copies in the low-poly and high-poly folders
  for file in public/assets/models/*.glb; do
    if [ -f "$file" ]; then
      base_name=$(basename "$file")
      
      # Copy to low-poly if it doesn't exist
      if [ ! -f "public/assets/models/low-poly/$base_name" ]; then
        echo "Copying $base_name to low-poly directory..."
        cp "$file" "public/assets/models/low-poly/$base_name"
      fi
      
      # Copy to high-poly if it doesn't exist
      if [ ! -f "public/assets/models/high-poly/$base_name" ]; then
        echo "Copying $base_name to high-poly directory..."
        cp "$file" "public/assets/models/high-poly/$base_name"
      fi
    fi
  done
else
  echo "⚠️ No models found in public/assets/models"
  
  # Check if models exist in the renderer/public directory
  if [ -d "src/renderer/public/assets/models" ]; then
    echo "Found models in src/renderer/public/assets/models, copying..."
    cp -r src/renderer/public/assets/models/* public/assets/models/
    
    # Copy to low-poly and high-poly directories
    for file in public/assets/models/*.glb; do
      if [ -f "$file" ]; then
        base_name=$(basename "$file")
        cp "$file" "public/assets/models/low-poly/$base_name"
        cp "$file" "public/assets/models/high-poly/$base_name"
      fi
    done
  else
    echo "⚠️ Models not found in renderer directory either"
  fi
fi

# Copy models to src/renderer/public for development
echo "📋 Ensuring models are available in renderer/public for development..."
mkdir -p src/renderer/public/assets/models
mkdir -p src/renderer/public/assets/models/low-poly
mkdir -p src/renderer/public/assets/models/high-poly
mkdir -p src/renderer/public/draco
mkdir -p src/renderer/public/draco/gltf

# Copy models from public to renderer/public
if [ -d "public/assets/models" ] && [ "$(ls -A public/assets/models)" ]; then
  echo "Copying models to renderer/public directory..."
  cp -r public/assets/models/* src/renderer/public/assets/models/
fi

# Copy Draco decoders to renderer/public
if [ -d "public/draco" ]; then
  echo "Copying Draco decoders to renderer/public directory..."
  cp -r public/draco/* src/renderer/public/draco/
fi

# Fix symbolic links (prevent circular references)
echo "🔗 Checking for circular symbolic links..."
find public -type l -exec ls -la {} \; | grep public
find src/renderer/public -type l -exec ls -la {} \; | grep public

echo "Removing any problematic symbolic links..."
find public -type l -exec rm -f {} \;
find src/renderer/public -type l -exec rm -f {} \;

echo "✅ All symbolic links have been cleaned up"

# Create JSON model index
echo "📝 Creating model index file..."
cat > public/assets/models/index.json << EOL
{
  "models": [
EOL

# Add each model to the index
first=true
for file in public/assets/models/*.glb; do
  if [ -f "$file" ]; then
    base_name=$(basename "$file" .glb)
    
    if [ "$first" = true ]; then
      first=false
    else
      echo "    ," >> public/assets/models/index.json
    fi
    
    echo "    {" >> public/assets/models/index.json
    echo "      \"id\": \"$base_name\"," >> public/assets/models/index.json
    echo "      \"file\": \"$base_name.glb\"," >> public/assets/models/index.json
    echo "      \"lowPoly\": \"low-poly/$base_name.glb\"," >> public/assets/models/index.json
    echo "      \"highPoly\": \"high-poly/$base_name.glb\"" >> public/assets/models/index.json
    echo "    }" >> public/assets/models/index.json
  fi
done

echo "  ]" >> public/assets/models/index.json
echo "}" >> public/assets/models/index.json

# Copy the index file to renderer/public
cp public/assets/models/index.json src/renderer/public/assets/models/

# Create a simple HTML test page for model loading
echo "🧪 Creating model test page..."
cat > public/model-test.html << EOL
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Model Loading Test</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    canvas { display: block; width: 100vw; height: 100vh; }
    #info { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; }
    #controls { position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; }
    select, button { margin: 5px; padding: 5px; }
  </style>
</head>
<body>
  <div id="info">
    <h3>3D Model Loading Test</h3>
    <p>Status: <span id="status">Loading...</span></p>
    <p>Selected Model: <span id="modelName">None</span></p>
    <p>Loading Path: <span id="modelPath">None</span></p>
  </div>
  
  <div id="controls">
    <select id="modelSelect">
      <option value="">Select a model...</option>
    </select>
    <button id="reload">Reload</button>
  </div>

  <script type="module">
    import * as THREE from 'https://cdn.skypack.dev/three@0.137.0';
    import { OrbitControls } from 'https://cdn.skypack.dev/three@0.137.0/examples/jsm/controls/OrbitControls.js';
    import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.137.0/examples/jsm/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'https://cdn.skypack.dev/three@0.137.0/examples/jsm/loaders/DRACOLoader.js';

    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // Set up loaders
    const dracoLoader = new DRACOLoader();
    
    // Try multiple Draco paths
    const dracoPaths = [
      './draco/',
      '../draco/',
      '/draco/',
      './draco/gltf/',
      '/draco/gltf/',
      'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
    ];
    
    // Test Draco paths
    async function testDracoPaths() {
      for (const path of dracoPaths) {
        try {
          const response = await fetch(path + 'draco_decoder.js', { method: 'HEAD' });
          if (response.ok) {
            console.log('Found working Draco path:', path);
            return path;
          }
        } catch (e) {
          console.log('Failed Draco path:', path);
        }
      }
      
      // Default to CDN if nothing works
      return 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
    }
    
    // Model paths to try
    const modelBasePaths = [
      './assets/models/',
      '../assets/models/',
      '/assets/models/',
      './assets/models/low-poly/',
      '/assets/models/low-poly/',
      './assets/models/high-poly/',
      '/assets/models/high-poly/'
    ];
    
    // Current model in the scene
    let currentModel = null;
    
    // Load a model
    async function loadModel(modelId) {
      // Update UI
      document.getElementById('status').textContent = 'Loading...';
      document.getElementById('modelName').textContent = modelId;
      
      // Remove current model if it exists
      if (currentModel) {
        scene.remove(currentModel);
        currentModel = null;
      }
      
      // Initialize the GLTF loader with Draco support
      const dracoPath = await testDracoPaths();
      dracoLoader.setDecoderPath(dracoPath);
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      
      // Try different paths
      let loaded = false;
      
      for (const basePath of modelBasePaths) {
        if (loaded) break;
        
        const modelPath = basePath + modelId + '.glb';
        document.getElementById('modelPath').textContent = modelPath;
        
        try {
          console.log('Attempting to load from:', modelPath);
          const result = await new Promise((resolve, reject) => {
            loader.load(modelPath, resolve, undefined, reject);
          });
          
          console.log('Model loaded successfully from:', modelPath);
          document.getElementById('status').textContent = 'Loaded from ' + modelPath;
          
          // Add model to scene
          currentModel = result.scene;
          scene.add(currentModel);
          
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(currentModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          
          currentModel.scale.set(scale, scale, scale);
          currentModel.position.sub(center.multiplyScalar(scale));
          
          loaded = true;
        } catch (error) {
          console.log('Failed to load from', modelPath, error);
        }
      }
      
      if (!loaded) {
        document.getElementById('status').textContent = 'Failed to load model';
        
        // Add a fallback cube
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        currentModel = cube;
      }
    }
    
    // Populate model select dropdown
    async function populateModelSelect() {
      try {
        // Try to load index.json first
        const response = await fetch('./assets/models/index.json');
        
        if (response.ok) {
          const data = await response.json();
          const select = document.getElementById('modelSelect');
          
          data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            select.appendChild(option);
          });
        } else {
          throw new Error('Failed to load index.json');
        }
      } catch (error) {
        console.log('Failed to load model index:', error);
        
        // Add some default models
        const defaultModels = [
          'Brain1', 'BrainstemNerves', 'CrainialNerves', 'midbrain', 'pons',
          'SpinalNerves1', 'Thalamus-Basal', 'Visual-Pathway'
        ];
        
        const select = document.getElementById('modelSelect');
        defaultModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          select.appendChild(option);
        });
      }
    }
    
    // Set up model selection change event
    document.getElementById('modelSelect').addEventListener('change', (event) => {
      const modelId = event.target.value;
      if (modelId) {
        loadModel(modelId);
      }
    });
    
    // Reload button
    document.getElementById('reload').addEventListener('click', () => {
      const modelId = document.getElementById('modelSelect').value;
      if (modelId) {
        loadModel(modelId);
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    
    // Initialize
    populateModelSelect();
    animate();
  </script>
</body>
</html>
EOL

# Copy test page to renderer/public
cp public/model-test.html src/renderer/public/

echo "✅ Model test page created successfully"

# Fix Vite config to properly handle static assets
echo "🛠️ Updating Vite config to handle static assets properly..."

# Backup the existing vite.config.js
cp vite.config.js vite.config.js.bak

# Write a new vite.config.js with improved asset handling
cat > vite.config.js << EOL
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/main.ts',
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  publicDir: 'public',
  server: {
    fs: {
      // Allow serving files from project root and one level up
      strict: false,
      allow: [
        resolve(__dirname, 'public'),
        resolve(__dirname, 'src/renderer'),
        resolve(__dirname, 'src/renderer/public'),
        resolve(__dirname) // Allow from project root
      ],
    },
    watch: {
      // Watch for changes in these directories
      ignored: ['!**/public/**', '!**/src/renderer/**']
    }
  },
})
EOL

echo "✅ Vite configuration updated successfully"

# Update package.json build scripts
echo "📦 Updating package.json build scripts..."

# Use jq if available to modify package.json, otherwise warn that it needs manual updates
if command -v jq &> /dev/null; then
  jq '.scripts["build:renderer"] = "vite build --outDir dist/renderer"' package.json > package.json.tmp && mv package.json.tmp package.json
  jq '.scripts["build"] = "npm run build:renderer && npm run build:electron"' package.json > package.json.tmp && mv package.json.tmp package.json
  echo "✅ Package.json scripts updated successfully"
else
  echo "⚠️ jq not found - please manually update the build scripts in package.json:"
  echo '  "build:renderer": "vite build --outDir dist/renderer",'
  echo '  "build": "npm run build:renderer && npm run build:electron",'
fi

echo ""
echo "🎉 All model loading issues fixed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to test the application in development mode"
echo "2. Use the model-test.html page to verify model loading paths"
echo "3. Run 'npm run build' to build the application for production"
echo ""
echo "If you still encounter issues, check:"
echo "- The browser console for error messages"
echo "- The model paths in modelRegistry.ts"
echo "- The Draco decoder path configuration"
echo ""