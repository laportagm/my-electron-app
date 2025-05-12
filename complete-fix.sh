#!/bin/bash

echo "=== Running complete model loading fix ==="

# Setup Draco decoder files
echo "=== Setting up Draco decoder files ==="
mkdir -p public/draco
cp -R node_modules/three/examples/jsm/libs/draco/* public/draco/

# Fix model paths and create test models
echo "=== Fixing model paths and creating test models ==="

# Create directories for low-poly and high-poly models
mkdir -p public/assets/models/low-poly
mkdir -p public/assets/models/high-poly

# Copy or create symbolic links to the actual models if they exist
if [ -d "/Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models" ]; then
  echo "Creating optimized model references..."

  # For each model, create both a low-poly and high-poly reference (they point to the same file for now)
  for model in /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/*.glb; do
    basename=$(basename "$model")
    cp "$model" "public/assets/models/$basename"
    # For testing purposes, create duplicate references
    ln -sf "../$basename" "public/assets/models/low-poly/$basename"
    ln -sf "../$basename" "public/assets/models/high-poly/$basename"
  done
else
  # If source directory doesn't exist, check if models are already in place
  MODEL_COUNT=$(ls -1 public/assets/models/*.glb 2>/dev/null | wc -l)
  if [ "$MODEL_COUNT" -gt 0 ]; then
    echo "Models already exist, creating low/high-poly references..."
    for model in public/assets/models/*.glb; do
      basename=$(basename "$model")
      # Create duplicate references if they don't already exist
      if [ ! -f "public/assets/models/low-poly/$basename" ]; then
        ln -sf "../$basename" "public/assets/models/low-poly/$basename"
      fi
      if [ ! -f "public/assets/models/high-poly/$basename" ]; then
        ln -sf "../$basename" "public/assets/models/high-poly/$basename"
      fi
    done
  else
    echo "⚠️ No models found. The application will use fallback cubes instead of actual models."
  fi
fi

echo "=== Creating model index file ==="
# Create a model index file for your application to reference
cat > public/assets/models/index.json << EOL
{
  "models": [
    {
      "id": "Brain1",
      "name": "Complete Brain",
      "lowUrl": "./assets/models/low-poly/Brain1.glb",
      "highUrl": "./assets/models/high-poly/Brain1.glb"
    },
    {
      "id": "BrainstemNerves",
      "name": "Brainstem Nerves",
      "lowUrl": "./assets/models/low-poly/BrainstemNerves.glb",
      "highUrl": "./assets/models/high-poly/BrainstemNerves.glb"
    },
    {
      "id": "midbrain",
      "name": "Midbrain",
      "lowUrl": "./assets/models/low-poly/midbrain.glb",
      "highUrl": "./assets/models/high-poly/midbrain.glb"
    }
  ]
}
EOL

# Check for symlinks in vite development directory
echo "=== Setting up symlinks for Vite development ==="
if [ ! -L "src/renderer/public/assets" ]; then
  echo "Creating assets symlink for Vite development..."
  mkdir -p src/renderer/public
  ln -sf ../../../public/assets src/renderer/public/assets
fi

if [ ! -L "src/renderer/public/draco" ]; then
  echo "Creating draco symlink for Vite development..."
  mkdir -p src/renderer/public
  ln -sf ../../../public/draco src/renderer/public/draco
fi

# Create test HTML file to verify models are accessible
echo "=== Creating a test HTML page to verify 3D model loading ==="
cat > public/test.html << EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3D Model Test</title>
  <style>
    body { margin: 0; overflow: hidden; background: #222; color: #fff; font-family: Arial, sans-serif; }
    canvas { display: block; }
    #info { position: absolute; top: 10px; width: 100%; text-align: center; color: white; z-index: 100; }
    #paths { position: absolute; bottom: 10px; width: 100%; text-align: center; color: #aaa; font-size: 12px; }
  </style>
</head>
<body>
  <div id="info">Testing Brain Models - Loading...</div>
  <div id="paths"></div>
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

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);

    // Add grid
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Setup Draco loader
    const dracoLoader = new DRACOLoader();

    // Try multiple paths for Draco
    const dracoPaths = [
      './draco/gltf/',
      './draco/',
      '/draco/gltf/',
      '/draco/',
      'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
    ];

    let dracoPathIndex = 0;

    // Try to load with the first path
    dracoLoader.setDecoderPath(dracoPaths[dracoPathIndex]);

    // Setup GLTF loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Try multiple paths for models
    const modelPaths = [
      './assets/models/Brain1.glb',
      '/assets/models/Brain1.glb',
      './assets/models/low-poly/Brain1.glb',
      '/assets/models/low-poly/Brain1.glb',
      './public/assets/models/Brain1.glb',
      '/public/assets/models/Brain1.glb'
    ];

    let currentModelPath = 0;

    function tryLoadModel() {
      if (currentModelPath >= modelPaths.length) {
        console.error('Failed to load model from all paths. Trying with different Draco decoder...');

        // Try next Draco path
        dracoPathIndex++;

        if (dracoPathIndex < dracoPaths.length) {
          dracoLoader.setDecoderPath(dracoPaths[dracoPathIndex]);
          console.log('Trying Draco path:', dracoPaths[dracoPathIndex]);
          currentModelPath = 0;
          tryLoadModel();
        } else {
          console.error('All paths failed. Could not load model.');
          document.getElementById('info').innerHTML = 'FAILED: Could not load model from any path';
          document.getElementById('info').style.color = 'red';
        }

        return;
      }

      const modelPath = modelPaths[currentModelPath];
      console.log('Trying to load model from:', modelPath);
      document.getElementById('info').innerHTML = 'Loading from: ' + modelPath;
      document.getElementById('paths').innerHTML = 'Draco path: ' + dracoPaths[dracoPathIndex];

      gltfLoader.load(
        modelPath,
        function(gltf) {
          // Success
          console.log('Model loaded successfully from:', modelPath);
          document.getElementById('info').innerHTML = 'SUCCESS: Model loaded from ' + modelPath;
          document.getElementById('info').style.color = 'green';

          // Center model
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          gltf.scene.position.x -= center.x;
          gltf.scene.position.y -= center.y;
          gltf.scene.position.z -= center.z;

          scene.add(gltf.scene);
        },
        function(xhr) {
          console.log('Loading: ' + (xhr.loaded / xhr.total * 100) + '%');
        },
        function(error) {
          console.error('Error loading from ' + modelPath + ':', error);

          // Try next path
          currentModelPath++;
          tryLoadModel();
        }
      );
    }

    // Start loading
    tryLoadModel();

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
EOL

# Final check
echo "=== Running final validation ==="
if [ -d "public/assets/models" ] && [ -d "public/draco" ]; then
  echo "✅ Model and Draco directories exist"

  if [ -f "public/assets/models/Brain1.glb" ]; then
    echo "✅ At least one model file exists"
  else
    echo "⚠️ No model files found in primary directory"
  fi

  if [ -f "public/draco/draco_decoder.js" ] && [ -f "public/draco/draco_decoder.wasm" ]; then
    echo "✅ Draco decoder files exist"
  else
    echo "⚠️ Draco decoder files are missing"
  fi

  if [ -L "src/renderer/public/assets" ] && [ -L "src/renderer/public/draco" ]; then
    echo "✅ Symlinks are set up correctly"
  else
    echo "⚠️ Symlinks may be missing"
  fi
else
  echo "❌ Setup failed"
fi

echo "=== Setup complete! ==="
echo "To test model loading, open public/test.html in a browser"
echo "To run the application with the fixed model loading, use: npm run dev"
