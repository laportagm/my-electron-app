// Mock for the main.ts file
// This allows us to test the startup functionality without actually running the real main process

import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger, handleError } from '../../utils/logger';

// Mock constants
const PRELOAD_PATHS = [
  path.join(process.cwd(), 'src/main/preload.js'),
  path.join(process.cwd(), 'src/main/preload/preload.js'),
  path.join(process.cwd(), 'src/main/preload/preload-fixed.js')
];

// Store references for testing
let mainWindow: BrowserWindow | null = null;

// Helper function to find a valid preload script
function findPreloadScript(): string {
  for (const preloadPath of PRELOAD_PATHS) {
    try {
      if (fs.existsSync(preloadPath)) {
        logger.info(`Using preload script: ${preloadPath}`);
        return preloadPath;
      }
    } catch (error) {
      logger.warn(`Error checking preload script at ${preloadPath}:`, error);
    }
  }
  
  logger.warn('No preload script found, using fallback path');
  return PRELOAD_PATHS[0]; // Fallback to first path
}

// Initialize app
async function initializeApp() {
  try {
    logger.info('Initializing Electron application');
    
    // Setup basic app handlers
    setupAppHandlers();
    
    // Create main window
    createMainWindow();
    
    // Setup IPC handlers
    setupIpcHandlers();
    
    logger.info('Application started successfully');
  } catch (error) {
    handleError(error as Error, 'Application initialization');
  }
}

// Setup app handlers
function setupAppHandlers() {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

// Create the main window
function createMainWindow() {
  // Get preload script path
  const preloadPath = findPreloadScript();
  
  // Create window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // Setup error handlers
  setupErrorHandlers(mainWindow);
  
  // Load content
  if (process.env.NODE_ENV === 'development') {
    // Development - load from local server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production - load from file
    mainWindow.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
}

// Setup error handlers
function setupErrorHandlers(window: BrowserWindow) {
  window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`Failed to load: ${errorDescription} (${errorCode})`);
    
    if (errorDescription.includes('preload')) {
      // Try to recover with alternate preload script
      createRecoveryWindow();
    }
  });
}

// Create a recovery window with alternate preload script
function createRecoveryWindow() {
  logger.info('Creating recovery window with alternate preload script');
  
  // Try to find alternate preload script
  const fixedPreloadPath = path.join(process.cwd(), 'src/main/preload/preload-fixed.js');
  
  // Create recovery window
  const recoveryWindow = new BrowserWindow({
    width: mainWindow?.getBounds().width || 1024,
    height: mainWindow?.getBounds().height || 768,
    x: mainWindow?.getBounds().x,
    y: mainWindow?.getBounds().y,
    webPreferences: {
      preload: fixedPreloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // Close old window and assign new one
  if (mainWindow) {
    mainWindow.close();
  }
  mainWindow = recoveryWindow;
  
  // Load content in recovery window
  if (process.env.NODE_ENV === 'development') {
    recoveryWindow.loadURL('http://localhost:3000');
  } else {
    recoveryWindow.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
}

// Setup IPC handlers
function setupIpcHandlers() {
  // App path handler
  ipcMain.handle('app:get-path', (event, name) => {
    return app.getPath(name as any);
  });
  
  // Filesystem handlers
  ipcMain.handle('fs:read-file', async (event, filePath) => {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      handleError(error as Error, `Reading file: ${filePath}`);
      return null;
    }
  });
  
  ipcMain.handle('fs:write-file', async (event, filePath, content) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      handleError(error as Error, `Writing file: ${filePath}`);
      return false;
    }
  });
  
  ipcMain.handle('fs:read-dir', async (event, dirPath) => {
    try {
      return await fs.promises.readdir(dirPath);
    } catch (error) {
      handleError(error as Error, `Reading directory: ${dirPath}`);
      return [];
    }
  });
}

// Export the functions for testing
// Don't call app.whenReady() directly
export { mainWindow, initializeApp };