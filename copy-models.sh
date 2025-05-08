#!/bin/bash

# Copy models from desktop to our app's public directory
mkdir -p /Users/gagelaporta/my-electron-app/public/assets/models
cp -R /Users/gagelaporta/Desktop/Threejs_ReactApp2/public/assets/models/* /Users/gagelaporta/my-electron-app/public/assets/models/

# Create a directory for Draco decoder
mkdir -p /Users/gagelaporta/my-electron-app/public/draco

# Make a note which models are lower poly (for testing)
echo "# These models are available in the public/assets/models directory:
Brain1.glb
BrainstemNerves.glb
BrainstenBasal.glb
caudal-medulla.glb
CrainialNerves.glb
midbrain.glb
pons.glb
rostral-medulla.glb
SpinalNerves1.glb
SpinalNerves2.glb
SpinalNerves3.glb
SpinalNerves4.glb
SpinalNerves5.glb
SpinalNerves6.glb
StriatumBasal-Left.glb
StriatumBasal-Right.glb
Thalamus-Basal.glb
Tracts.glb
Visual-Pathway-skull.glb
Visual-Pathway.glb
" > /Users/gagelaporta/my-electron-app/public/assets/models/README.txt

echo "Models copied successfully!"
