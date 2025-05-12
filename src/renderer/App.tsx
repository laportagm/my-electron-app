import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Viewer from './pages/Viewer'
import { useAppStore } from './store/useAppStore'
import ErrorBoundary from './components/ErrorBoundary'
import { setupGlobalErrorHandlers } from './utils/errorHandler'

function App() {
  const theme = useAppStore((s) => s.theme)
  
  // Set up global error handlers on mount
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);
  
  // Apply theme to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme]);

  return (
    <ErrorBoundary 
      fallback={(error, resetError) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Application Error</h1>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              The application encountered an unexpected error:
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded mb-4">
              <p className="text-red-800 dark:text-red-300">{error.message}</p>
            </div>
            <button 
              onClick={resetError} 
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      )}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Viewer />} />
          <Route path="/quiz" element={<div>Quiz Page (Coming Soon)</div>} />
          <Route path="/settings" element={<div>Settings Page (Coming Soon)</div>} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
