// src/utils/config.ts

// For main process
import * as dotenv from 'dotenv';
import path from 'path';
import { app } from 'electron';

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
  loggingLevels?: {
    assets?: 'verbose' | 'normal' | 'quiet';
    models?: 'verbose' | 'normal' | 'quiet';
  };
}

// Simple in-memory store as a fallback
const memoryStore: Record<string, any> = {
  // Default logging configuration
  loggingLevels: {
    assets: 'normal',  // Default to normal logging
    models: 'normal'
  }
};

// Create a simple store implementation that doesn't rely on electron-store
const store = {
  get: (key: string) => {
    // Try to get from localStorage in renderer process
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const value = window.localStorage.getItem(`config_${key}`);
        return value ? JSON.parse(value) : null;
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    }
    
    // Fallback to memory store
    return memoryStore[key] || null;
  },
  
  set: (key: string, value: any) => {
    // Store in localStorage in renderer process
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`config_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing to localStorage:', e);
      }
    }
    
    // Always store in memory
    memoryStore[key] = value;
  }
};

export const rendererConfig = {
  getApiUrl: (): string | undefined => {
    return store.get('apiUrl');
  },

  getTheme: (): 'light' | 'dark' => {
    const theme = store.get('theme');
    return theme === 'light' || theme === 'dark' ? theme : 'light';
  },

  setTheme: (theme: 'light' | 'dark'): void => {
    store.set('theme', theme);
  },

  // Asset and model logging configuration
  getLoggingLevel: (category: 'assets' | 'models'): 'verbose' | 'normal' | 'quiet' => {
    const loggingLevels = store.get('loggingLevels') || {};
    const level = loggingLevels[category];

    // Return valid logging levels only, default to 'normal'
    return (level === 'verbose' || level === 'normal' || level === 'quiet')
      ? level
      : 'normal';
  },

  setLoggingLevel: (category: 'assets' | 'models', level: 'verbose' | 'normal' | 'quiet'): void => {
    const loggingLevels = store.get('loggingLevels') || {};
    loggingLevels[category] = level;
    store.set('loggingLevels', loggingLevels);
  }
};