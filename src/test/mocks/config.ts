/**
 * Mock config module for testing
 */
import { vi } from 'vitest';

// Mock main process config
export const config = {
  apiUrl: 'http://localhost:5173',
  modelStoragePath: '/mock/models',
  debugMode: false
};

// Mock specific functions for renderer config
export const rendererConfig = {
  getApiUrl: vi.fn().mockReturnValue('http://localhost:5173'),
  getTheme: vi.fn().mockReturnValue('light'),
  setTheme: vi.fn(),
  
  // Logging related functions
  getLoggingLevel: vi.fn().mockReturnValue('normal'),
  setLoggingLevel: vi.fn()
};

export default {
  config,
  rendererConfig
};