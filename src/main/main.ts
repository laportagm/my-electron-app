import { app, BrowserWindow, session, ipcMain } from 'electron'
import * as path from 'path'
import { config } from '../utils/config'
import { logger, handleError } from '../utils/logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  try {
    mainWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Filter out Autofill.enable errors in DevTools
    mainWindow.webContents.on('devtools-opened', () => {
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://devtools.devtools/*'] }, (details, callback) => {
        if (details.url.includes('autofill.enable')) {
          callback({ cancel: true })
        } else {
          callback({ cancel: false })
        }
      })
    })

    if (process.env.NODE_ENV === 'development') {
      // Use the configured API URL instead of hardcoded value
      mainWindow.loadURL(config.apiUrl)
      mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })

    logger.info('Main window created successfully')
  } catch (error) {
    handleError(error as Error, 'Creating main window')
  }
}

// Initialize app
app.whenReady().then(() => {
  try {
    createWindow()
    
    // Set up IPC handlers for logging from renderer
    ipcMain.on('log', (_event, message) => {
      logger.info(`Renderer: ${message}`)
    })
    
    ipcMain.on('error', (_event, message, errorMessage, errorStack) => {
      logger.error(`Renderer Error: ${message}`, 
        errorMessage ? new Error(`${errorMessage}\n${errorStack}`) : undefined)
    })
    
    logger.info('Application started successfully')
  } catch (error) {
    handleError(error as Error, 'Application initialization')
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.info('All windows closed, quitting application')
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.info('Activated application with no windows, creating new window')
    createWindow()
  }
})

// Graceful error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  handleError(error, 'Uncaught exception')
  
  // If the error is fatal, quit the app after logging
  if (error.message.includes('fatal') || error instanceof TypeError) {
    logger.error('Fatal error encountered, shutting down application')
    app.quit()
  }
})
