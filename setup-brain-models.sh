#!/bin/bash

echo "====== Setting up Brain Models Loading Pipeline ======"

# 1. Create needed directories
mkdir -p public/draco
mkdir -p public/assets/models

# 2. Copy Draco decoder files 
echo "Copying Draco decoder files..."
cp -R node_modules/three/examples/jsm/libs/draco public/

# 3. Copy the models from source to public directory
echo "Copying brain models from Desktop to project..."
cp -R /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/* public/assets/models/

# 4. Create low-poly versions for testing (simulating them)
echo "Creating low-poly and high-poly version references..."
cat > public/models.json << EOL
{
  "models": [
    {
      "id": "Brain1",
      "lowUrl": "/assets/models/Brain1.glb",
      "highUrl": "/assets/models/Brain1.glb",
      "description": "Full brain model"
    },
    {
      "id": "BrainstemNerves",
      "lowUrl": "/assets/models/BrainstemNerves.glb",
      "highUrl": "/assets/models/BrainstemNerves.glb",
      "description": "Brainstem nerves"
    },
    {
      "id": "midbrain",
      "lowUrl": "/assets/models/midbrain.glb",
      "highUrl": "/assets/models/midbrain.glb",
      "description": "Midbrain model"
    }
  ]
}
EOL

echo "Installation complete!"
echo "You can now run the application with: npm run dev"
echo ""
echo "IMPORTANT: Verify the following in your console when the app runs:"
echo "- Console should log: Loading low poly... → Swapped high poly in X s → Cached."
echo "- Check that load and swap times are as expected"
echo "- Network tab should show two GET requests per model (low + high) only on first load"
echo "- Subsequent model views should use the cache"
echo "- Scene should visibly swap models"
