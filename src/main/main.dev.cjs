// A simple development version of main process in CommonJS format
// This file is used only in development mode

const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Access config and logger from relative paths
// Get the URL from the environment (passed by wait-and-launch.js)
// or fall back to default
const config = {
  apiUrl: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
};
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error
};

const handleError = (error, context) => {
  console.error(`ERROR in ${context}:`, error);
};

let mainWindow = null;

async function createWindow() {
  try {
    // In development, the preload.js file is directly in the src/main directory
    const preloadPath = path.join(__dirname, 'preload.js');
    
    console.log('Development mode preload path:', preloadPath);
    console.log('Current directory:', __dirname);

    mainWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false // Disable for development only
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

    // In development, connect to the dev server that's confirmed to be available
    try {
      logger.info(`Loading development server from: ${config.apiUrl}`);
      await mainWindow.loadURL(config.apiUrl);
      mainWindow.webContents.openDevTools();
    } catch (e) {
      logger.error(`Failed to load URL ${config.apiUrl}:`, e);
      throw e; // Let the outer catch handler deal with it
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    logger.info('Main window created successfully in development mode');
  } catch (error) {
    handleError(error, 'Creating main window');
  }
}

// Initialize app
app.whenReady().then(async () => {
  try {
    await createWindow();
    
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
      return app.getPath(name);
    });
    
    ipcMain.handle('fs:read-dir', async (_event, dirPath) => {
      try {
        return await fs.promises.readdir(dirPath);
      } catch (error) {
        logger.error(`Failed to read directory ${dirPath}:`, error);
        throw error;
      }
    });
    
    ipcMain.handle('fs:read-file', async (_event, filePath) => {
      try {
        return await fs.promises.readFile(filePath, 'utf-8');
      } catch (error) {
        logger.error(`Failed to read file ${filePath}:`, error);
        throw error;
      }
    });
    
    ipcMain.handle('fs:write-file', async (_event, filePath, data) => {
      try {
        await fs.promises.writeFile(filePath, data, 'utf-8');
        return true;
      } catch (error) {
        logger.error(`Failed to write file ${filePath}:`, error);
        throw error;
      }
    });
    
    logger.info('Development application started successfully');
  } catch (error) {
    handleError(error, 'Application initialization');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('All windows closed, quitting application');
    app.quit();
  }
});

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