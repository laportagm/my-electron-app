"use strict";
// Development version of main.ts with simplified preload path handling
// This file is used only in development mode
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
let mainWindow = null;
async function createWindow() {
    try {
        // In development, the preload.js file is directly in the src/main directory
        const preloadPath = path.join(__dirname, 'preload.js');
        console.log('Development mode preload path:', preloadPath);
        console.log('Current directory:', __dirname);
        mainWindow = new electron_1.BrowserWindow({
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
            electron_1.session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://devtools.devtools/*'] }, (details, callback) => {
                if (details.url.includes('autofill.enable')) {
                    callback({ cancel: true });
                }
                else {
                    callback({ cancel: false });
                }
            });
        });
        // In development, always try to connect to the dev server
        try {
            await mainWindow.loadURL(config_1.config.apiUrl);
            mainWindow.webContents.openDevTools();
        }
        catch (e) {
            // If the default URL fails, try an alternative
            const altPort = config_1.config.apiUrl.includes('5174') ? '5173' : '5174';
            const altUrl = config_1.config.apiUrl.replace(/:\d+/, `:${altPort}`);
            logger_1.logger.warn(`Failed to load URL ${config_1.config.apiUrl}, trying ${altUrl}`);
            await mainWindow.loadURL(altUrl);
            mainWindow.webContents.openDevTools();
        }
        mainWindow.on('closed', () => {
            mainWindow = null;
        });
        logger_1.logger.info('Main window created successfully in development mode');
    }
    catch (error) {
        (0, logger_1.handleError)(error, 'Creating main window');
    }
}
// Initialize app
electron_1.app.whenReady().then(async () => {
    try {
        await createWindow();
        // Set up IPC handlers for logging from renderer
        electron_1.ipcMain.on('log', (_event, message) => {
            logger_1.logger.info(`Renderer: ${message}`);
        });
        electron_1.ipcMain.on('error', (_event, message, errorMessage, errorStack) => {
            logger_1.logger.error(`Renderer Error: ${message}`, errorMessage ? new Error(`${errorMessage}\n${errorStack}`) : undefined);
        });
        // Set up IPC handlers for file system operations
        electron_1.ipcMain.handle('app:get-path', (_event, name) => {
            return electron_1.app.getPath(name);
        });
        electron_1.ipcMain.handle('fs:read-dir', async (_event, dirPath) => {
            try {
                return await fs.promises.readdir(dirPath);
            }
            catch (error) {
                logger_1.logger.error(`Failed to read directory ${dirPath}:`, error);
                throw error;
            }
        });
        electron_1.ipcMain.handle('fs:read-file', async (_event, filePath) => {
            try {
                return await fs.promises.readFile(filePath, 'utf-8');
            }
            catch (error) {
                logger_1.logger.error(`Failed to read file ${filePath}:`, error);
                throw error;
            }
        });
        electron_1.ipcMain.handle('fs:write-file', async (_event, filePath, data) => {
            try {
                await fs.promises.writeFile(filePath, data, 'utf-8');
                return true;
            }
            catch (error) {
                logger_1.logger.error(`Failed to write file ${filePath}:`, error);
                throw error;
            }
        });
        logger_1.logger.info('Development application started successfully');
    }
    catch (error) {
        (0, logger_1.handleError)(error, 'Application initialization');
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        logger_1.logger.info('All windows closed, quitting application');
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', async () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        logger_1.logger.info('Activated application with no windows, creating new window');
        await createWindow();
    }
});
// Graceful error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    (0, logger_1.handleError)(error, 'Uncaught exception');
    // If the error is fatal, quit the app after logging
    if (error.message.includes('fatal') || error instanceof TypeError) {
        logger_1.logger.error('Fatal error encountered, shutting down application');
        electron_1.app.quit();
    }
});
