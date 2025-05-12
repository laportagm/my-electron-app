#!/bin/bash

echo "=== COMPLETE SETUP AND FIX SCRIPT ==="

# 1. Remove any existing symlinks to prevent circular references
echo "Removing all symlinks..."
find ./src/renderer -type l -delete
find ./public -type l -delete

# 2. Ensure proper directory structure
echo "Creating proper directory structure..."
mkdir -p public/assets/models
mkdir -p public/draco
mkdir -p src/renderer/assets/models
mkdir -p src/renderer/draco

# 3. Ensure Draco decoders are available
echo "Setting up Draco decoders..."
if [ -d "node_modules/three/examples/jsm/libs/draco" ]; then
  cp -r node_modules/three/examples/jsm/libs/draco/* public/draco/
  cp -r node_modules/three/examples/jsm/libs/draco/* src/renderer/draco/
  echo "✅ Draco decoders copied successfully"
else
  echo "Installing Three.js first..."
  npm install three
  cp -r node_modules/three/examples/jsm/libs/draco/* public/draco/
  cp -r node_modules/three/examples/jsm/libs/draco/* src/renderer/draco/
  echo "✅ Draco decoders installed and copied"
fi

# 4. Copy models to all required locations
echo "Setting up model files..."

# Check if models exist and copy them to renderer location for development
for model in public/assets/models/*.glb; do
  if [ -f "$model" ]; then
    cp -v "$model" src/renderer/assets/models/
  fi
done

echo "✅ Model files set up successfully"

# 5. Update the vite.config.js file
echo "Updating vite.config.js for proper static asset handling..."

# Create a backup of vite.config.js
cp vite.config.js vite.config.js.backup

cat > vite.config.js << EOL
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'three'],
          'three-extras': [
            'three/examples/jsm/loaders/GLTFLoader.js',
            'three/examples/jsm/loaders/DRACOLoader.js'
          ]
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  plugins: [
    react()
  ],
  css: {
    postcss: resolve(__dirname, 'postcss.config.js'),
  },
  server: {
    fs: {
      // Allow serving files from any location
      strict: false,
      allow: [
        // Allow serving files from these locations
        resolve(__dirname, 'public'),
        resolve(__dirname, 'src/renderer'),
        resolve(__dirname, 'src/renderer/public'),
        resolve(__dirname) // Allow from project root
      ],
    },
    watch: {
      // Watch for changes in public and renderer directories
      ignored: ['!**/public/**', '!**/src/renderer/**']
    }
  }
})
EOL

echo "✅ Vite config updated successfully"

# 6. Create a model test page
echo "Creating a model test page to verify loading..."

cat > public/model-test.html << EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Model Path Tester</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    #results {
      margin-top: 20px;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
      background: white;
    }
    .path-test {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .success {
      color: green;
      font-weight: bold;
    }
    .failure {
      color: red;
    }
    .info {
      color: blue;
      font-style: italic;
    }
    button {
      padding: 10px 15px;
      background: #4c8bf5;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #3b7ae4;
    }
    .model-select {
      margin-bottom: 20px;
    }
    select, input {
      padding: 8px;
      font-size: 16px;
      margin-right: 10px;
    }
    #modelView {
      margin-top: 20px;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
      background: #f9f9f9;
    }
    canvas {
      width: 100%;
      height: 400px;
      background: #333;
    }
  </style>
</head>
<body>
  <h1>3D Model Path Tester</h1>
  
  <div class="model-select">
    <select id="modelSelect">
      <option value="Brain1">Brain1</option>
      <option value="BrainstemNerves">BrainstemNerves</option>
      <option value="midbrain">midbrain</option>
      <option value="pons">pons</option>
      <option value="CrainialNerves">CrainialNerves</option>
      <option value="StriatumBasal-Left">StriatumBasal-Left</option>
    </select>
    <input type="text" id="customPath" placeholder="Custom path to test..." style="width: 300px;">
    <button id="testButton">Test Paths</button>
  </div>
  
  <div id="results">
    <p>Click "Test Paths" to check which model paths work in this environment.</p>
  </div>
  
  <div id="modelView">
    <h2>Model Viewer</h2>
    <div id="canvasContainer"></div>
  </div>
  
  <script async src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.153.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.153.0/examples/jsm/"
      }
    }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
    
    // Setup Three.js scene
    let scene, camera, renderer, controls;
    let currentModel = null;
    
    function initScene() {
      // Remove previous canvas if it exists
      const container = document.getElementById('canvasContainer');
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      // Create new scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x333333);
      
      // Setup camera
      camera = new THREE.PerspectiveCamera(75, container.clientWidth / 400, 0.1, 1000);
      camera.position.z = 5;
      
      // Setup renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, 400);
      container.appendChild(renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Add grid and axes
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);
      
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      // Add controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      
      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      
      animate();
      
      // Handle window resize
      window.addEventListener('resize', function() {
        const width = container.clientWidth;
        camera.aspect = width / 400;
        camera.updateProjectionMatrix();
        renderer.setSize(width, 400);
      });
    }
    
    // Initialize the scene
    initScene();
    
    // Test if a model can be loaded from a specific path
    async function testModelPath(path) {
      return new Promise((resolve) => {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('draco/');
        
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        
        const startTime = performance.now();
        
        gltfLoader.load(
          path,
          function(gltf) {
            const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
            resolve({
              success: true, 
              time: loadTime,
              model: gltf.scene
            });
          },
          function(xhr) {
            // Progress callback
          },
          function(error) {
            resolve({
              success: false,
              error: error.message
            });
          }
        );
        
        // Set a timeout in case the loader stalls
        setTimeout(() => {
          resolve({
            success: false,
            error: 'Timeout after 5 seconds'
          });
        }, 5000);
      });
    }
    
    // Display the model in the viewer
    function displayModel(model) {
      // Remove previous model if it exists
      if (currentModel) {
        scene.remove(currentModel);
      }
      
      // Add new model
      scene.add(model);
      currentModel = model;
      
      // Center the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;
      
      // Adjust camera to fit model
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
      
      camera.position.z = cameraDistance * 1.5;
      camera.lookAt(0, 0, 0);
    }
    
    // Test button event handler
    document.getElementById('testButton').addEventListener('click', async function() {
      const modelId = document.getElementById('modelSelect').value;
      const customPath = document.getElementById('customPath').value.trim();
      const resultsDiv = document.getElementById('results');
      
      // Clear previous results
      resultsDiv.innerHTML = '<h2>Testing paths for: ' + modelId + '</h2>';
      
      // List of paths to test
      const basePaths = [
        './assets/models/',
        '/assets/models/',
        '../assets/models/',
        '../../assets/models/',
        '/public/assets/models/',
        './public/assets/models/',
        'assets/models/',
        './assets/models/low-poly/',
        '/assets/models/low-poly/',
        './assets/models/high-poly/',
        '/assets/models/high-poly/'
      ];
      
      // Add custom path if provided
      const pathsToTest = customPath ? 
        [customPath] : 
        basePaths.map(base => \`\${base}\${modelId}.glb\`);
      
      // Test each path
      let successfulModel = null;
      
      for (const path of pathsToTest) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'path-test';
        resultsDiv.appendChild(resultDiv);
        
        resultDiv.innerHTML = \`<div>Testing: <code>\${path}</code>...</div>\`;
        
        const result = await testModelPath(path);
        
        if (result.success) {
          resultDiv.innerHTML += \`<div class="success">✅ SUCCESS! Loaded in \${result.time}s</div>\`;
          resultDiv.innerHTML += \`<button class="view-model-btn" data-path="\${path}">View This Model</button>\`;
          
          // Store the first successful model
          if (!successfulModel) {
            successfulModel = result.model;
          }
          
          // Add click event for the view button
          resultDiv.querySelector('.view-model-btn').addEventListener('click', function() {
            displayModel(result.model);
          });
        } else {
          resultDiv.innerHTML += \`<div class="failure">❌ Failed: \${result.error}</div>\`;
        }
      }
      
      // Display the first successful model if any
      if (successfulModel) {
        displayModel(successfulModel);
        resultsDiv.innerHTML += \`<div class="info" style="margin-top: 15px">First successful model is now displayed in the viewer below.</div>\`;
      } else {
        resultsDiv.innerHTML += \`<div class="failure" style="margin-top: 15px">❌ All paths failed. No model could be loaded.</div>\`;
      }
    });
  </script>
</body>
</html>
EOL

echo "✅ Model test page created"

# 7. Final check
echo "Running final checks..."
if [ -d "public/assets/models" ] && [ -d "public/draco" ]; then
  echo "✅ Model and Draco directories exist"
  
  if ls public/assets/models/*.glb 1> /dev/null 2>&1; then
    echo "✅ Models exist"
  else
    echo "⚠️ No model files found in primary directory"
  fi
  
  if [ -f "public/draco/draco_decoder.js" ] && [ -f "public/draco/draco_decoder.wasm" ]; then
    echo "✅ Draco decoder files exist"
  else
    echo "⚠️ Draco decoder files are missing"
  fi
else
  echo "❌ Setup failed"
fi

echo "=== SETUP COMPLETE! ==="
echo ""
echo "You can now run the application with:"
echo "  npm run dev        # For development"
echo "  npm run build      # For production build"
echo ""
echo "To test model loading, open http://localhost:5173/model-test.html in a browser while the app is running"