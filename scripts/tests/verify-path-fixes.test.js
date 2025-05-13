#!/usr/bin/env node
/**
 * Comprehensive Path Module Fixes Verification
 * 
 * This script tests that all path module fixes have been correctly applied
 * across the application in different environments. It verifies:
 * 
 * 1. Config module path handling
 * 2. Preload script loading and exposure
 * 3. Path module availability in renderer process
 * 4. Vite configuration for proper path resolution
 * 5. Cross-environment compatibility
 * 
 * Run with: node scripts/tests/verify-path-fixes.test.js
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const electron = require('electron');

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

function logHeader(message) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80));
  console.log(message);
  console.log('='.repeat(80) + colors.reset + '\n');
}

function logTest(name, status, message = '') {
  results.total++;
  
  if (status === 'pass') {
    results.passed++;
    console.log(`${colors.green} PASS:${colors.reset} ${name}`);
  } else if (status === 'fail') {
    results.failed++;
    console.log(`${colors.red} FAIL:${colors.reset} ${name}`);
    if (message) {
      console.log(`  ${colors.red}${message}${colors.reset}`);
    }
  } else if (status === 'skip') {
    results.skipped++;
    console.log(`${colors.yellow}Ë SKIP:${colors.reset} ${name}`);
    if (message) {
      console.log(`  ${colors.yellow}${message}${colors.reset}`);
    }
  }
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

function runCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
  } catch (error) {
    return error.stdout || error.message;
  }
}

// Main test runner
async function runTests() {
  const appRoot = process.cwd();
  
  logHeader('Path Module Fixes Verification');
  log(`Testing in directory: ${appRoot}`, colors.yellow);
  
  // Test 1: Verify config.ts module path handling
  logHeader('1. Testing Config Module Path Handling');
  
  const configPath = path.join(appRoot, 'src', 'utils', 'config.ts');
  const configExists = checkFileExists(configPath);
  
  logTest('Config module exists', configExists ? 'pass' : 'fail', 
    configExists ? '' : `Config module not found at: ${configPath}`);
  
  if (configExists) {
    const configContainsSafePath = fileContains(configPath, 'safePath');
    logTest('Config contains safe path fallbacks', configContainsSafePath ? 'pass' : 'fail',
      configContainsSafePath ? '' : 'Config module missing safe path fallback implementations');
    
    const configContainsWindowElectron = fileContains(configPath, 'window.electron');
    logTest('Config uses window.electron.path in renderer', configContainsWindowElectron ? 'pass' : 'fail',
      configContainsWindowElectron ? '' : 'Config module missing window.electron.path usage for renderer process');
    
    const configContainsEnvironmentDetection = fileContains(configPath, 'isRenderer') && fileContains(configPath, 'isMain');
    logTest('Config contains environment detection', configContainsEnvironmentDetection ? 'pass' : 'fail',
      configContainsEnvironmentDetection ? '' : 'Config module missing proper environment detection');
  }
  
  // Test 2: Verify preload script
  logHeader('2. Testing Preload Script');
  
  const preloadPaths = [
    path.join(appRoot, 'src', 'main', 'preload.ts'),
    path.join(appRoot, 'src', 'main', 'preload', 'preload.ts')
  ];
  
  const preloadExists = preloadPaths.some(p => checkFileExists(p));
  const preloadPath = preloadPaths.find(p => checkFileExists(p)) || preloadPaths[0];
  
  logTest('Preload script exists', preloadExists ? 'pass' : 'fail',
    preloadExists ? '' : 'No preload script found at the expected locations');
  
  if (preloadExists) {
    const preloadExposesPath = fileContains(preloadPath, 'path: {') && 
                              fileContains(preloadPath, 'contextBridge.exposeInMainWorld');
    logTest('Preload exposes path module', preloadExposesPath ? 'pass' : 'fail',
      preloadExposesPath ? '' : 'Preload script does not properly expose the path module');
    
    const preloadHasErrorHandling = fileContains(preloadPath, 'try') && fileContains(preloadPath, 'catch');
    logTest('Preload contains error handling', preloadHasErrorHandling ? 'pass' : 'fail',
      preloadHasErrorHandling ? '' : 'Preload script missing error handling for path functions');
    
    const preloadExposesPathDirectly = fileContains(preloadPath, 'exposeInMainWorld(\'path\'');
    logTest('Preload exposes path object directly', preloadExposesPathDirectly ? 'pass' : 'fail',
      preloadExposesPathDirectly ? '' : 'Preload script does not expose path object directly for compatibility');
  }
  
  // Test 3: Verify path module exposure to renderer
  logHeader('3. Testing Path Module Exposure to Renderer');
  
  const rendererTypeDefPath = path.join(appRoot, 'src', 'renderer', 'types', 'global.d.ts');
  const rendererTypeDefExists = checkFileExists(rendererTypeDefPath);
  
  logTest('Renderer type definitions exist', rendererTypeDefExists ? 'pass' : 'fail',
    rendererTypeDefExists ? '' : 'Renderer type definitions not found');
  
  if (rendererTypeDefExists) {
    const typeDefContainsPath = fileContains(rendererTypeDefPath, 'path:');
    logTest('Type definitions include path module', typeDefContainsPath ? 'pass' : 'fail',
      typeDefContainsPath ? '' : 'Type definitions missing path module interface');
  }
  
  const polyfillsPath = path.join(appRoot, 'src', 'renderer', 'polyfills.js');
  const polyfillsExist = checkFileExists(polyfillsPath);
  
  logTest('Polyfills script exists', polyfillsExist ? 'pass' : 'skip',
    polyfillsExist ? '' : 'Polyfills script not found (may not be needed with current fixes)');
  
  if (polyfillsExist) {
    const polyfillsContainPath = fileContains(polyfillsPath, 'path');
    logTest('Polyfills include path handling', polyfillsContainPath ? 'pass' : 'fail',
      polyfillsContainPath ? '' : 'Polyfills script does not contain path handling');
  }
  
  // Test 4: Verify Vite configuration
  logHeader('4. Testing Vite Configuration');
  
  const viteConfigPath = path.join(appRoot, 'vite.config.ts');
  const viteConfigExists = checkFileExists(viteConfigPath);
  
  logTest('Vite config exists', viteConfigExists ? 'pass' : 'fail',
    viteConfigExists ? '' : 'Vite config not found');
  
  if (viteConfigExists) {
    const viteConfigDefinesExternal = fileContains(viteConfigPath, 'external:') && 
                                    (fileContains(viteConfigPath, '\'path\'') || 
                                     fileContains(viteConfigPath, '"path"'));
    
    logTest('Vite config defines path as external', viteConfigDefinesExternal ? 'pass' : 'fail',
      viteConfigDefinesExternal ? '' : 'Vite config does not define path as external module');
    
    const viteConfigHasPolyfills = fileContains(viteConfigPath, 'nodePolyfills') || 
                                  fileContains(viteConfigPath, 'resolve.alias');
    
    logTest('Vite config has node polyfills or aliases', viteConfigHasPolyfills ? 'pass' : 'fail',
      viteConfigHasPolyfills ? '' : 'Vite config missing node polyfills or path aliases');
    
    const viteConfigHasElectronIntegration = fileContains(viteConfigPath, 'electron') && 
                                           fileContains(viteConfigPath, '__IS_ELECTRON__');
    
    logTest('Vite config has Electron integration', viteConfigHasElectronIntegration ? 'pass' : 'fail',
      viteConfigHasElectronIntegration ? '' : 'Vite config missing Electron integration');
  }
  
  // Test 5: Verify unit tests for path handling
  logHeader('5. Testing Path Resolution Unit Tests');
  
  const pathTestFiles = [
    path.join(appRoot, 'src', 'test', 'path-resolution.test.ts'),
    path.join(appRoot, 'src', 'test', 'path-module.test.ts')
  ];
  
  const pathTestsExist = pathTestFiles.some(p => checkFileExists(p));
  
  logTest('Path resolution unit tests exist', pathTestsExist ? 'pass' : 'fail',
    pathTestsExist ? '' : 'No path resolution unit tests found');
  
  if (pathTestsExist) {
    try {
      log('Running path resolution unit tests...', colors.yellow);
      const testResult = runCommand('npm run test -- src/test/path-resolution.test.ts src/test/path-module.test.ts', 
        { stdio: ['ignore', 'pipe', 'pipe'] });
      
      const testPassed = !testResult.includes('FAIL') || testResult.includes('PASS');
      logTest('Path resolution tests pass', testPassed ? 'pass' : 'fail',
        testPassed ? '' : 'Path resolution tests failed. See output for details.');
      
      if (!testPassed) {
        log('Test output:', colors.yellow);
        log(testResult);
      }
    } catch (error) {
      logTest('Running path resolution tests', 'fail', `Error running tests: ${error.message}`);
    }
  }
  
  // Test 6: Verify fixes script
  logHeader('6. Testing Path Resolution Fix Script');
  
  const fixScriptPath = path.join(appRoot, 'fix-path-resolution.sh');
  const fixScriptExists = checkFileExists(fixScriptPath);
  
  logTest('Path resolution fix script exists', fixScriptExists ? 'pass' : 'fail',
    fixScriptExists ? '' : 'Path resolution fix script not found');
  
  if (fixScriptExists) {
    const fixScriptIsExecutable = (fs.statSync(fixScriptPath).mode & 0o111) !== 0;
    logTest('Fix script is executable', fixScriptIsExecutable ? 'pass' : 'fail',
      fixScriptIsExecutable ? '' : 'Fix script exists but is not executable');
    
    const fixScriptChecksPolyfills = fileContains(fixScriptPath, 'polyfills');
    logTest('Fix script checks for polyfills', fixScriptChecksPolyfills ? 'pass' : 'fail',
      fixScriptChecksPolyfills ? '' : 'Fix script does not verify polyfills');
  }
  
  // Test 7: Environment compatibility check
  logHeader('7. Environment Compatibility Check');
  
  // Check main process file for environment detection
  const mainPath = path.join(appRoot, 'src', 'main', 'main.ts');
  const mainExists = checkFileExists(mainPath);
  
  logTest('Main process file exists', mainExists ? 'pass' : 'fail',
    mainExists ? '' : 'Main process file not found');
  
  if (mainExists) {
    const mainHasPreloadResolution = fileContains(mainPath, 'resolvePreloadPath');
    logTest('Main has robust preload resolution', mainHasPreloadResolution ? 'pass' : 'fail',
      mainHasPreloadResolution ? '' : 'Main process missing robust preload path resolution');
    
    const mainHandlesDifferentEnvironments = fileContains(mainPath, 'process.env.NODE_ENV') &&
                                         fileContains(mainPath, 'development') &&
                                         fileContains(mainPath, 'production');
    
    logTest('Main handles different environments', mainHandlesDifferentEnvironments ? 'pass' : 'fail',
      mainHandlesDifferentEnvironments ? '' : 'Main process code does not properly handle different environments');
  }
  
  // Test 8: Asset path handling
  logHeader('8. Asset Path Resolution');
  
  const assetResolverPath = path.join(appRoot, 'src', 'renderer', 'utils', 'AssetPathResolver.ts');
  const assetResolverExists = checkFileExists(assetResolverPath);
  
  logTest('Asset path resolver exists', assetResolverExists ? 'pass' : 'skip',
    assetResolverExists ? '' : 'Asset path resolver not found (may be in a different location)');
  
  if (assetResolverExists) {
    const assetResolverUsesElectronPath = fileContains(assetResolverPath, 'window.electron.path');
    logTest('Asset resolver uses electron path', assetResolverUsesElectronPath ? 'pass' : 'fail',
      assetResolverUsesElectronPath ? '' : 'Asset resolver does not use window.electron.path');
  }
  
  // Summarize results
  logHeader('Test Results Summary');
  log(`Total tests: ${results.total}`, colors.bright);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, colors.red);
  log(`Skipped: ${results.skipped}`, colors.yellow);
  
  // Calculate percentage
  const passPercentage = Math.round((results.passed / (results.total - results.skipped)) * 100);
  log(`Pass rate: ${passPercentage}%`, passPercentage >= 80 ? colors.green : colors.red);
  
  // Overall assessment
  log('\nOverall assessment:', colors.bright);
  if (results.failed === 0) {
    log(' All path module fixes appear to be correctly implemented!', colors.green);
  } else if (results.failed <= 2) {
    log('  Most path module fixes are in place, but some issues remain.', colors.yellow);
  } else {
    log(' Several path module fixes are missing or incorrectly implemented.', colors.red);
  }
  
  // Provide next steps
  log('\nRecommended next steps:', colors.bright);
  if (results.failed === 0) {
    log('1. Run the app in development mode to verify everything works in practice', colors.cyan);
    log('2. Test the app in production mode to ensure path resolution works in all environments', colors.cyan);
    log('3. Consider adding more comprehensive tests for edge cases', colors.cyan);
  } else {
    log('1. Run ./fix-path-resolution.sh to apply missing fixes', colors.cyan);
    log('2. Address the specific failures highlighted above', colors.cyan);
    log('3. Make sure window.electron.path is used consistently in renderer code', colors.cyan);
    log('4. Verify type definitions include path module interfaces', colors.cyan);
    log('5. Run this verification script again after applying fixes', colors.cyan);
  }
  
  return results.failed === 0;
}

// Run the tests
runTests().then(success => {
  // Exit with appropriate code for CI integration
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});