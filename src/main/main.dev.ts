// Development version of main.ts with simplified preload path handling
// This file is used only in development mode

// Use require syntax for better CommonJS compatibility
// @ts-ignore
const { app, BrowserWindow, session, ipcMain } = require('electron');
// @ts-ignore
const path = require('path');
// @ts-ignore
const fs = require('fs');
// CommonJS compatible imports
const { config } = require('../utils/config');
const { logger, handleError } = require('../utils/logger');

// @ts-ignore - Using any for development version
let mainWindow: any = null;

async function createWindow(): Promise<void> {
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
      session.defaultSession.webRequest.onBeforeRequest(
        { urls: ['*://devtools.devtools/*'] },
        (details: { url: string }, callback: (response: { cancel: boolean }) => void) => {
          if (details.url.includes('autofill.enable')) {
            callback({ cancel: true });
          } else {
            callback({ cancel: false });
          }
        }
      );
    });

    // In development, always try to connect to the dev server
    try {
      await mainWindow.loadURL(config.apiUrl);
      mainWindow.webContents.openDevTools();
    } catch (e) {
      // If the default URL fails, try an alternative
      const altPort = config.apiUrl.includes('5174') ? '5173' : '5174';
      const altUrl = config.apiUrl.replace(/:\d+/, `:${altPort}`);
      logger.warn(`Failed to load URL ${config.apiUrl}, trying ${altUrl}`);
      await mainWindow.loadURL(altUrl);
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    logger.info('Main window created successfully in development mode');
  } catch (error) {
    handleError(error as Error, 'Creating main window');
  }
}

// Initialize app
app.whenReady().then(async () => {
  try {
    await createWindow();
    
    // Set up IPC handlers for logging from renderer
    ipcMain.on('log', (_event: Electron.IpcMainEvent, message: string) => {
      logger.info(`Renderer: ${message}`);
    });

    ipcMain.on('error', (_event: Electron.IpcMainEvent, message: string, errorMessage: string, errorStack: string) => {
      logger.error(`Renderer Error: ${message}`,
        errorMessage ? new Error(`${errorMessage}\n${errorStack}`) : undefined);
    });
    
    // Set up IPC handlers for file system operations
    ipcMain.handle('app:get-path', (_event: Electron.IpcMainInvokeEvent, name: string) => {
      return app.getPath(name as any);
    });

    ipcMain.handle('fs:read-dir', async (_event: Electron.IpcMainInvokeEvent, dirPath: string) => {
      try {
        return await fs.promises.readdir(dirPath);
      } catch (error) {
        logger.error(`Failed to read directory ${dirPath}:`, error as Error);
        throw error;
      }
    });

    ipcMain.handle('fs:read-file', async (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
      try {
        return await fs.promises.readFile(filePath, 'utf-8');
      } catch (error) {
        logger.error(`Failed to read file ${filePath}:`, error as Error);
        throw error;
      }
    });

    ipcMain.handle('fs:write-file', async (_event: Electron.IpcMainInvokeEvent, filePath: string, data: string) => {
      try {
        await fs.promises.writeFile(filePath, data, 'utf-8');
        return true;
      } catch (error) {
        logger.error(`Failed to write file ${filePath}:`, error as Error);
        throw error;
      }
    });
    
    logger.info('Development application started successfully');
  } catch (error) {
    handleError(error as Error, 'Application initialization');
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