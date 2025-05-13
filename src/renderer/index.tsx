/**
 * Application entry point
 * First imports MUST be polyfills to ensure environment compatibility
 */

// Import polyfills first (before any other imports)
import './polyfills.js';

// Import the electron API to ensure API is available
import electron from './electron';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Setup error handlers
import { setupGlobalErrorHandlers } from './utils/errorHandler';

// Initialize error handlers before mounting the app
setupGlobalErrorHandlers();

// Log initialization
console.log('Initializing application...');
console.log('Electron API available:', !!electron);
console.log('Path module available:', !!window.path);

// Mount the application
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
