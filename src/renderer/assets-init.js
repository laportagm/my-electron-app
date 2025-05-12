// ES Module version of assets initialization
import { assetLogger } from './utils/assetLogger';
import { rendererConfig } from '../utils/config';

// Preload Draco decoders to ensure they're available
window.dracoDecoderPath = '/draco/';

// Debug function to test if a file exists - now uses assetLogger to control verbosity
const checkFileExists = async (url) => {
  // Get current logging level for assets
  const logLevel = rendererConfig.getLoggingLevel('assets');

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      assetLogger.pathSuccess(url);
    } else {
      assetLogger.pathFailure(url);
    }
    return response.ok;
  } catch (e) {
    assetLogger.pathFailure(url, e.message);
    return false;
  }
};

// Check essential files on page load
const checkEssentialFiles = async () => {
  assetLogger.assetInfo('Checking essential files...');

  // Test Draco decoder files from various paths
  assetLogger.assetDebug('Testing Draco decoder paths');
  await checkFileExists('/draco/draco_decoder.js');
  await checkFileExists('/draco/draco_decoder.wasm');
  await checkFileExists('/draco/gltf/draco_decoder.js');
  await checkFileExists('./draco/draco_decoder.js');
  await checkFileExists('../draco/draco_decoder.js');

  // Test a sample model from multiple paths
  assetLogger.assetDebug('Testing model paths');
  await checkFileExists('/assets/models/Brain1.glb');
  await checkFileExists('./assets/models/Brain1.glb');
  await checkFileExists('../assets/models/Brain1.glb');
  await checkFileExists('/public/assets/models/Brain1.glb');
  await checkFileExists('/assets/models/low-poly/Brain1.glb');

  assetLogger.assetInfo('If no suitable paths were found, please open /model-test.html to diagnose further.');
};

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', checkEssentialFiles);

// Export for potential reuse
export { checkFileExists, checkEssentialFiles };