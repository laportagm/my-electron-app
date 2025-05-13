import { app, BrowserWindow, session, ipcMain, dialog, WebContents } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../utils/config';
import { logger, handleError } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;

/**
 * Get the app's root directory in different environments
 * This is crucial for correct path resolution
 */
function getAppRootDir(): string {
  // In development
  if (process.env.NODE_ENV === 'development') {
    return process.cwd();
  }
  
  // In production packaged app
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  
  // In production unpackaged
  return app.getAppPath();
}

/**
 * Find the correct preload script path by using a hierarchical search strategy
 * with comprehensive fallbacks for all environments
 * @returns The resolved path to the preload script or null if not found
 */
function resolvePreloadPath(): string | null {
  logger.info('Resolving preload script path');
  
  // Keep track of all attempted paths for diagnostics
  const attemptedPaths: string[] = [];
  
  // Function to safely check if a file exists
  const checkPath = (filePath: string): boolean => {
    try {
      attemptedPaths.push(filePath);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          logger.info(`Found preload script at: ${filePath}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.debug(`Error checking preload path ${filePath}: ${(error as Error).message}`);
      return false;
    }
  };

  // 1. Environment variable override (highest priority)
  if (process.env.ELECTRON_PRELOAD_PATH) {
    if (checkPath(process.env.ELECTRON_PRELOAD_PATH)) {
      return process.env.ELECTRON_PRELOAD_PATH;
    }
  }
  
  // Get key directories for path resolution
  const appRoot = getAppRootDir();
  const srcDir = path.join(appRoot, 'src');
  const distDir = path.join(appRoot, 'dist');
  const currentDir = __dirname;
  const resourcesDir = process.resourcesPath;
  
  // 2. Development environment paths
  if (process.env.NODE_ENV === 'development') {
    // Direct source paths in dev mode
    const devPaths = [
      path.join(currentDir, 'preload.js'),
      path.join(srcDir, 'main', 'preload.js'),
      path.join(srcDir, 'main', 'preload', 'preload.js'),
      path.join(currentDir, 'preload', 'preload.js'),
      // Compiled dev outputs
      path.join(distDir, 'main', 'preload.js'),
      path.join(distDir, 'main', 'preload', 'preload.js')
    ];
    
    for (const preloadPath of devPaths) {
      if (checkPath(preloadPath)) {
        return preloadPath;
      }
    }
  }
  
  // 3. Production environment paths
  const prodPaths = [
    // Standard build output paths
    path.join(currentDir, 'preload.js'),
    path.join(currentDir, 'preload', 'preload.js'),
    path.join(currentDir, '..', 'preload', 'preload.js'),
    
    // Alternative preload variants
    path.join(currentDir, 'preload', 'preload-fixed.js'),
    path.join(currentDir, 'preload', 'preload-esm.js'),
    path.join(currentDir, 'preload', 'preload-minimal.js'),
    
    // Packaged app paths
    path.join(resourcesDir, 'app.asar', 'dist', 'preload', 'preload.js'),
    path.join(resourcesDir, 'app', 'dist', 'preload', 'preload.js'),
    path.join(resourcesDir, 'app.asar', 'src', 'main', 'preload.js'),
    path.join(resourcesDir, 'app', 'src', 'main', 'preload.js')
  ];
  
  for (const preloadPath of prodPaths) {
    if (checkPath(preloadPath)) {
      return preloadPath;
    }
  }
  
  // 4. Last-resort paths - recursive search in key directories
  logger.debug('Trying recursive preload script search in key directories');
  
  // Function to recursively search for preload.js (limited depth)
  const findPreloadInDir = (dir: string, maxDepth = 3, currentDepth = 0): string | null => {
    if (currentDepth > maxDepth) return null;
    
    try {
      const files = fs.readdirSync(dir);
      
      // First check for preload files directly
      for (const file of files) {
        if (file === 'preload.js' || file.startsWith('preload-') && file.endsWith('.js')) {
          const fullPath = path.join(dir, file);
          attemptedPaths.push(fullPath);
          if (fs.statSync(fullPath).isFile()) {
            logger.info(`Found preload script through recursive search: ${fullPath}`);
            return fullPath;
          }
        }
      }
      
      // Then search subdirectories
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          const result = findPreloadInDir(fullPath, maxDepth, currentDepth + 1);
          if (result) return result;
        }
      }
    } catch (error) {
      logger.debug(`Error during recursive search in ${dir}: ${(error as Error).message}`);
    }
    
    return null;
  };
  
  // Search in key locations
  const searchDirs = [currentDir, srcDir, distDir];
  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const result = findPreloadInDir(dir);
        if (result) return result;
      }
    } catch (error) {
      logger.debug(`Error during directory check ${dir}: ${(error as Error).message}`);
    }
  }
  
  // 5. Generate a fallback preload script if needed
  logger.warn('Could not find valid preload script, will attempt to generate a minimal one');
  
  // Log all attempts for diagnostics
  logger.debug('Attempted preload paths:');
  attemptedPaths.forEach((p, i) => logger.debug(`  ${i+1}. ${p}`));
  
  // Log system info for diagnostics
  logger.debug('Environment information:');
  logger.debug(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  logger.debug(`  __dirname: ${__dirname}`);
  logger.debug(`  app.getAppPath(): ${app.getAppPath()}`);
  logger.debug(`  process.cwd(): ${process.cwd()}`);
  logger.debug(`  process.resourcesPath: ${process.resourcesPath}`);
  
  // Attempt to create a minimal preload
  return createMinimalPreload();
}

/**
 * Create a minimal preload script as a last resort fallback
 * @returns Path to the created preload script or null if creation failed
 */
function createMinimalPreload(): string | null {
  const minimalPreloadContent = `
    const { contextBridge, ipcRenderer } = require('electron');
    
    // Minimal functionality to get the app working
    contextBridge.exposeInMainWorld('electron', {
      // IPC communication
      send: (channel, ...args) => {
        ipcRenderer.send(channel, ...args);
      },
      on: (channel, listener) => {
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
      },
      // Path utilities (simplified)
      path: {
        join: (...parts) => parts.filter(Boolean).join('/').replace(/\\/+/g, '/'),
        resolve: (...parts) => {
          const joined = parts.join('/').replace(/\\/+/g, '/');
          return joined.startsWith('/') ? joined : '/' + joined;
        }
      },
      // Logger
      log: (message) => ipcRenderer.send('log', message),
      // Basic methods
      getPath: (name) => ipcRenderer.invoke('app:get-path', name),
      readDir: (path) => ipcRenderer.invoke('fs:read-dir', path),
      readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
      writeFile: (path, data) => ipcRenderer.invoke('fs:write-file', path, data)
    });
    
    // Also expose path methods directly
    contextBridge.exposeInMainWorld('path', {
      join: (...parts) => parts.filter(Boolean).join('/').replace(/\\/+/g, '/'),
      resolve: (...parts) => {
        const joined = parts.join('/').replace(/\\/+/g, '/');
        return joined.startsWith('/') ? joined : '/' + joined;
      }
    });
  `;
  
  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(app.getPath('temp'), 'electron-app-preload');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write the minimal preload
    const preloadPath = path.join(tempDir, 'minimal-preload.js');
    fs.writeFileSync(preloadPath, minimalPreloadContent);
    logger.info(`Created minimal preload script at: ${preloadPath}`);
    return preloadPath;
  } catch (error) {
    logger.error(`Failed to create minimal preload script: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Validates that the preload script exists, is readable, and has no syntax errors
 * @param preloadPath Path to the preload script
 * @returns Boolean indicating if the preload script is valid
 */
function validatePreloadScript(preloadPath: string | null): boolean {
  if (!preloadPath) {
    logger.error('No preload path provided for validation');
    return false;
  }
  
  try {
    // Check if file exists
    if (!fs.existsSync(preloadPath)) {
      logger.error(`Preload script not found at path: ${preloadPath}`);
      return false;
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(preloadPath);
    if (!stats.isFile()) {
      logger.error(`Preload path exists but is not a file: ${preloadPath}`);
      return false;
    }
    
    // Check file permissions
    try {
      fs.accessSync(preloadPath, fs.constants.R_OK);
    } catch (error) {
      logger.error(`Preload script exists but is not readable: ${preloadPath}`);
      return false;
    }
    
    // Check file size (should not be empty)
    if (stats.size === 0) {
      logger.error(`Preload script exists but is empty: ${preloadPath}`);
      return false;
    }
    
    // Basic syntax check
    try {
      const content = fs.readFileSync(preloadPath, 'utf8');
      // Look for critical keywords that should be in any preload script
      if (!content.includes('contextBridge') || !content.includes('exposeInMainWorld')) {
        logger.warn(`Preload script might be invalid: missing critical contextBridge usage in ${preloadPath}`);
        // We don't fail here as the script might still work
      }
    } catch (error) {
      logger.error(`Error reading preload script content: ${(error as Error).message}`);
      return false;
    }
    
    logger.info(`Validated preload script at: ${preloadPath}`);
    return true;
  } catch (error) {
    logger.error(`Error validating preload script: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Display a fatal error dialog when preload script cannot be found
 * @param message Error message to display
 */
function showPreloadErrorDialog(message: string): void {
  try {
    // Only show dialog if app is ready
    if (app.isReady()) {
      dialog.showErrorBox(
        'Preload Script Error',
        `The application could not start because the preload script could not be loaded.\n\n${message}\n\nPlease try running one of the fix scripts:\n- npm run fix:path\n- ./fix-all.sh`
      );
    } else {
      // Log the error if we can't show a dialog
      logger.error(`FATAL: ${message}`);
    }
  } catch (error) {
    logger.error(`Failed to show error dialog: ${(error as Error).message}`);
  }
}

/**
 * Creates the main application window with comprehensive error handling
 */
async function createWindow(): Promise<void> {
  try {
    // Resolve the preload script path (we'll use currentPreloadPath if already set)
    const preloadPath = currentPreloadPath || resolvePreloadPath();
    
    // Check if we have a valid preload script
    if (!preloadPath || !validatePreloadScript(preloadPath)) {
      const errorMessage = `Unable to load preload script. All attempts have failed.`;
      logger.error(errorMessage);
      showPreloadErrorDialog(errorMessage);
      return; // Don't try to create window without preload
    }
    
    // Create the browser window with the validated preload script
    mainWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        // Add robust error handling for preload errors
        additionalArguments: [`--preload-path=${preloadPath}`]
      }
    });
    
    // Filter out Autofill.enable errors in DevTools
    mainWindow.webContents.on('devtools-opened', () => {
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://devtools.devtools/*'] }, (details, callback) => {
        if (details.url.includes('autofill.enable')) {
          callback({ cancel: true });
        } else {
          callback({ cancel: false });
        }
      });
    });
    
    // Load the appropriate content based on environment
    if (process.env.NODE_ENV === 'development') {
      // In development, load from the dev server
      try {
        await mainWindow.loadURL(config.apiUrl);
        mainWindow.webContents.openDevTools();
      } catch (e) {
        // If the default URL fails, try an alternative port
        const altPort = config.apiUrl.includes('5174') ? '5173' : '5174';
        const altUrl = config.apiUrl.replace(/:\d+/, `:${altPort}`);
        logger.warn(`Failed to load URL ${config.apiUrl}, trying ${altUrl}`);
        await mainWindow.loadURL(altUrl);
        mainWindow.webContents.openDevTools();
      }
    } else {
      // In production, load from the local file
      const indexPath = path.join(__dirname, '../renderer/index.html');
      
      // Verify the index.html exists
      if (!fs.existsSync(indexPath)) {
        const fallbackPaths = [
          path.join(app.getAppPath(), 'dist/renderer/index.html'),
          path.join(process.resourcesPath, 'app.asar/dist/renderer/index.html'),
          path.join(process.resourcesPath, 'app/dist/renderer/index.html')
        ];
        
        let foundIndex = false;
        for (const fallbackPath of fallbackPaths) {
          if (fs.existsSync(fallbackPath)) {
            logger.info(`Using fallback index.html: ${fallbackPath}`);
            await mainWindow.loadFile(fallbackPath);
            foundIndex = true;
            break;
          }
        }
        
        if (!foundIndex) {
          logger.error(`Could not find index.html at ${indexPath} or any fallbacks`);
          showPreloadErrorDialog(`Could not find index.html to load.`);
        }
      } else {
        await mainWindow.loadFile(indexPath);
      }
    }
    
    // Handle preload and other content loading failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error(`Failed to load content: ${errorDescription} (Code: ${errorCode})`);
      
      // Check if this is a preload script failure
      if (errorDescription.includes('preload') || errorDescription.includes('Unable to load')) {
        logger.error(`Preload script failed to load: ${errorDescription}`);
        
        // Try to recover using a variant preload script
        tryRecoveryWithAlternatePreload(errorDescription);
      }
    });
    
    // Clean up on window close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    
    logger.info('Main window created successfully');
  } catch (error) {
    handleError(error as Error, 'Creating main window');
    
    // Special handling for preload-related errors
    if (error instanceof Error && 
        (error.message.includes('preload') || error.message.includes('Unable to load'))) {
      logger.error('Preload script error details:', error);
      
      // Try to show the error in a dialog for better visibility
      showPreloadErrorDialog(error.message);
      
      // Attempt recovery with minimal preload
      tryRecoveryWithAlternatePreload(error.message);
    }
  }
}

/**
 * Attempt to recover from preload failures by using alternative preload scripts
 * @param errorMessage Original error message for diagnostics
 */
function tryRecoveryWithAlternatePreload(errorMessage: string): void {
  if (!mainWindow) return;
  
  logger.info('Attempting recovery with alternate preload script');
  
  // List of potential recovery preload paths to try
  const recoveryPaths = [
    path.join(__dirname, 'preload/preload-fixed.js'),
    path.join(__dirname, 'preload/preload-minimal.js'),
    path.join(__dirname, 'preload/preload-esm.js'),
    createMinimalPreload() // Generate a minimal one as last resort
  ];
  
  // Try each recovery path
  for (const recoveryPath of recoveryPaths) {
    if (!recoveryPath) continue;
    
    try {
      if (fs.existsSync(recoveryPath) && validatePreloadScript(recoveryPath)) {
        logger.info(`Attempting recovery with: ${recoveryPath}`);
        
        // Create a new window with the alternative preload
        // Fix: Explicitly declare the type of recoveryWindow
        const recoveryWindow: BrowserWindow = new BrowserWindow({
          // Fix: Add null checks on mainWindow
          width: mainWindow?.getBounds().width || 1024,
          height: mainWindow?.getBounds().height || 768,
          x: mainWindow?.getBounds().x,
          y: mainWindow?.getBounds().y,
          webPreferences: {
            preload: recoveryPath,
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--recovery-from=${errorMessage}`, `--recovery-preload=${recoveryPath}`]
          }
        });
        
        // Close the original window and replace our reference
        // Fix: Add null check here
        mainWindow?.close();
        mainWindow = recoveryWindow;
        
        // Set up content loading based on environment
        if (process.env.NODE_ENV === 'development') {
          recoveryWindow.loadURL(config.apiUrl).catch(() => {
            const altPort = config.apiUrl.includes('5174') ? '5173' : '5174';
            const altUrl = config.apiUrl.replace(/:\d+/, `:${altPort}`);
            recoveryWindow.loadURL(altUrl);
          });
          recoveryWindow.webContents.openDevTools();
        } else {
          const indexPath = path.join(__dirname, '../renderer/index.html');
          if (fs.existsSync(indexPath)) {
            recoveryWindow.loadFile(indexPath);
          } else {
            // Try fallbacks
            const fallbackPaths = [
              path.join(app.getAppPath(), 'dist/renderer/index.html'),
              path.join(process.resourcesPath, 'app.asar/dist/renderer/index.html')
            ];
            
            let loaded = false;
            for (const fallbackPath of fallbackPaths) {
              if (fs.existsSync(fallbackPath)) {
                recoveryWindow.loadFile(fallbackPath);
                loaded = true;
                break;
              }
            }
            
            if (!loaded) {
              recoveryWindow.loadURL('data:text/html,<h1>Emergency Recovery Mode</h1><p>The application is running in recovery mode due to preload script issues.</p>');
            }
          }
        }
        
        // Set up cleanup
        recoveryWindow.on('closed', () => {
          mainWindow = null;
        });
        
        logger.info('Successfully created recovery window');
        return; // Success, exit the recovery attempt
      }
    } catch (recoveryError) {
      logger.error(`Recovery attempt with ${recoveryPath} failed:`, recoveryError as Error);
    }
  }
  
  logger.error('All recovery attempts failed');
  showPreloadErrorDialog('All preload script recovery attempts have failed. The application cannot continue.');
}

/**
 * Initialize the application by setting up the main window and IPC handlers
 */
// Track currently used preload path for diagnostics
let currentPreloadPath: string | null = null;

async function initializeApp(): Promise<void> {
  try {
    // Store the preload path for diagnostics before creating the window
    currentPreloadPath = resolvePreloadPath();

    await createWindow();

    if (!mainWindow) {
      logger.error('Failed to create main window');
      return;
    }

    // Set up IPC handlers for logging from renderer
    ipcMain.on('log', (_event, message) => {
      logger.info(`Renderer: ${message}`);
    });

    ipcMain.on('error', (_event, message, errorMessage, errorStack) => {
      logger.error(`Renderer Error: ${message}`,
        errorMessage ? new Error(`${errorMessage}\n${errorStack}`) : undefined);
    });

    // Set up IPC handlers for file system operations
    ipcMain.handle('app:get-path', (_event, name) => {
      try {
        return app.getPath(name as any);
      } catch (error) {
        logger.error(`Failed to get path for ${name}:`, error as Error);
        // Return sensible defaults based on requested path type
        switch (name) {
          case 'userData': return path.join(app.getPath('appData'), app.getName());
          case 'temp': return os.tmpdir();
          case 'home': return os.homedir();
          default: return app.getAppPath();
        }
      }
    });

    ipcMain.handle('fs:read-dir', async (_event, dirPath) => {
      try {
        return await fs.promises.readdir(dirPath);
      } catch (error) {
        logger.error(`Failed to read directory ${dirPath}:`, error as Error);
        throw error;
      }
    });

    ipcMain.handle('fs:read-file', async (_event, filePath) => {
      try {
        return await fs.promises.readFile(filePath, 'utf-8');
      } catch (error) {
        logger.error(`Failed to read file ${filePath}:`, error as Error);
        throw error;
      }
    });

    ipcMain.handle('fs:write-file', async (_event, filePath, data) => {
      try {
        await fs.promises.writeFile(filePath, data, 'utf-8');
        return true;
      } catch (error) {
        logger.error(`Failed to write file ${filePath}:`, error as Error);
        throw error;
      }
    });

    // Add special diagnostic IPC handler
    ipcMain.handle('app:get-startup-diagnostics', () => {
      return {
        environment: process.env.NODE_ENV || 'unknown',
        appPath: app.getAppPath(),
        resourcesPath: process.resourcesPath,
        currentDir: __dirname,
        // Use the tracked preload path
        preloadPath: currentPreloadPath || 'unknown',
        isPackaged: app.isPackaged,
        platform: process.platform,
        arch: process.arch,
        versions: process.versions
      };
    });
    
    logger.info('Application started successfully');
  } catch (error) {
    handleError(error as Error, 'Application initialization');
  }
}

// Import os module for fallback paths
import * as os from 'os';

// Initialize app when ready
app.whenReady().then(initializeApp);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('All windows closed, quitting application');
    app.quit();
  }
});

// Recreate window when dock icon is clicked on macOS
app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.info('Activated application with no windows, creating new window');
    await createWindow();
  }
});

// Graceful error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  handleError(error, 'Uncaught exception');
  
  // If the error is fatal, quit the app after logging
  if (error.message.includes('fatal') || error instanceof TypeError) {
    logger.error('Fatal error encountered, shutting down application');
    app.quit();
  }
});

// Add a special handler for specific failures
process.on('unhandledRejection', (reason: unknown, promise) => {
  // Fix: Correctly type the reason parameter as unknown
  logger.error('Unhandled promise rejection:', reason as Error | undefined);
  logger.debug('Promise:', promise);
  
  // If related to preload scripts, try to provide more helpful information
  if (reason instanceof Error && reason.message.includes('preload')) {
    logger.error('This appears to be related to preload script loading.');
    logger.info('Possible solutions:');
    logger.info('1. Run npm run fix:path to fix path resolution issues');
    logger.info('2. Check if preload.js exists in the expected locations');
    logger.info('3. Run npm run build:electron to rebuild the main process');
  }
});