// src/utils/config.ts

// For main process
import * as dotenv from 'dotenv';
import path from 'path';
import { app } from 'electron';
// Import the module using require to avoid TypeScript issues
// This is a workaround for the type definition problems
const ElectronStore = require('electron-store');

// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${environment}` });

export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:5173',
  modelStoragePath: process.env.MODEL_STORAGE_PATH || 
    path.join(app.getPath('userData'), 'models'),
  debugMode: process.env.DEBUG_MODE === 'true'
};

// For renderer process
// Define the schema type for better TypeScript support
interface ConfigStore {
  apiUrl?: string;
  theme?: 'light' | 'dark';
}

// Create a store instance using require-style import to avoid TypeScript issues
const store = new ElectronStore();

export const rendererConfig = {
  getApiUrl: (): string | undefined => {
    // Use any type to bypass TypeScript checking
    return (store as any).get('apiUrl');
  },
  
  getTheme: (): 'light' | 'dark' => {
    // Use any type to bypass TypeScript checking
    const theme = (store as any).get('theme');
    return theme === 'light' || theme === 'dark' ? theme : 'light';
  },
  
  setTheme: (theme: 'light' | 'dark'): void => {
    // Use any type to bypass TypeScript checking
    (store as any).set('theme', theme);
  }
};