import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { brainModels } from './modelRegistry';

/**
 * Diagnostic tool to check if model files can be loaded
 */
export async function diagnoseModelLoading(): Promise<{[key: string]: boolean}> {
  const results: {[key: string]: any} = {};
  const gltfLoader = new GLTFLoader();
  
  console.log('⚙️ Starting model diagnostics...');
  
  // Check if there's a Draco decoder available
  try {
    const dracoTest = await fetch('/draco/gltf/draco_decoder.js', { method: 'HEAD' });
    results.dracoDecoderAvailable = dracoTest.ok;
    console.log(`Draco decoder: ${dracoTest.ok ? '✅' : '❌'}`);
  } catch (e) {
    results.dracoDecoderAvailable = false;
    console.log('Draco decoder: ❌ (Error checking)');
  }
  
  // Check each model file
  for (const model of brainModels) {
    try {
      console.log(`Testing model: ${model.id} (${model.lowPolyUrl})`);
      
      // Check original path first
      const paths = [
        model.lowPolyUrl,
        `/assets/models/${model.lowPolyUrl.split('/').pop()}`,
        `assets/models/${model.lowPolyUrl.split('/').pop()}`,
        `/models/${model.lowPolyUrl.split('/').pop()}`,
      ];
      
      let foundPath = null;
      
      // Try each path
      for (const path of paths) {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          if (response.ok) {
            foundPath = path;
            break;
          }
        } catch (err) {
          console.log(`  Path failed: ${path}`);
          // Continue to next path
        }
      }
      
      if (foundPath) {
        console.log(`  ✅ Found model at: ${foundPath}`);
        // Try to actually load the model
        try {
          const gltf = await new Promise((resolve, reject) => {
            gltfLoader.load(
              foundPath,
              resolve,
              undefined,
              reject
            );
          });
          results[model.id] = { found: true, loaded: true, path: foundPath };
          console.log(`  ✅ Successfully loaded model`);
        } catch (loadErr) {
          results[model.id] = { found: true, loaded: false, error: loadErr.message, path: foundPath };
          console.log(`  ❌ File exists but could not be loaded: ${loadErr.message}`);
        }
      } else {
        results[model.id] = { found: false, loaded: false };
        console.log(`  ❌ Could not find model file at any path`);
      }
    } catch (error) {
      results[model.id] = { found: false, loaded: false, error: error.message };
      console.log(`  ❌ Error testing model ${model.id}: ${error.message}`);
    }
  }
  
  console.log('⚙️ Model diagnostics complete!');
  console.log('Results:', results);
  
  return results;
}

/**
 * Fix model paths based on diagnostics results
 */
export function fixModelPaths(diagnosticResults: {[key: string]: any}): void {
  // For each model in the registry, update the path if we found a working one
  brainModels.forEach(model => {
    const result = diagnosticResults[model.id];
    if (result && result.found && result.path) {
      console.log(`Fixing path for ${model.id}: ${model.lowPolyUrl} -> ${result.path}`);
      // Update both low and high poly paths
      model.lowPolyUrl = result.path;
      model.highPolyUrl = result.path;
    }
  });
  
  console.log('Updated model paths in registry');
}
