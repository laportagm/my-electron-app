import { app, BrowserWindow, session, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../utils/config';
import { logger, handleError } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  try {
    mainWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        preload: path.join(__dirname, 'preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false
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

    if (process.env.NODE_ENV === 'development') {
      // Use the configured API URL instead of hardcoded value
      // Try both URLs in case one is already in use
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
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    logger.info('Main window created successfully');
  } catch (error) {
    handleError(error as Error, 'Creating main window');
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
      return app.getPath(name as any);
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
    
    logger.info('Application started successfully');
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