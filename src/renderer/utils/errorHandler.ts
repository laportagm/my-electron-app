/**
 * Global Error Handler for the application
 */
import { useAppStore } from '@/store/useAppStore';

// Types of errors we want to track
export enum ErrorSource {
  RENDERING = 'rendering',
  MODEL_LOADING = 'model_loading',
  ASSET_LOADING = 'asset_loading',
  USER_INTERACTION = 'user_interaction',
  UNKNOWN = 'unknown'
}

export interface ApplicationError {
  message: string;
  source: ErrorSource;
  timestamp: number;
  stack?: string;
}

// Log error to console with formatting
export function logError(error: Error, source: ErrorSource = ErrorSource.UNKNOWN): void {
  console.error(
    `%c[ERROR] ${source.toUpperCase()}`,
    'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
    error
  );
  
  // Attempt to log to main process if available
  // Check if electron API is available on window
  const electronWindow = window as any;
  if (electronWindow.electron?.sendError) {
    electronWindow.electron.sendError(error.message, error.stack);
  }
}

// Handle error by logging and storing in app state
export function handleError(error: Error, source: ErrorSource = ErrorSource.UNKNOWN): void {
  // Log the error
  logError(error, source);
  
  // Create an application error object
  const appError: ApplicationError = {
    message: error.message,
    source,
    timestamp: Date.now(),
    stack: error.stack
  };
  
  // Add to app store's error list if it exists
  const store = useAppStore.getState();
  if (store.addError) {
    store.addError(appError);
  }
}

// Set up global error handlers
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    event.preventDefault();
    handleError(
      event.error || new Error(event.message),
      ErrorSource.UNKNOWN
    );
    return false;
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    handleError(error, ErrorSource.UNKNOWN);
    return false;
  });
  
  console.log('Global error handlers initialized');
}

// Create a wrapped version of async functions that catches errors
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  source: ErrorSource = ErrorSource.UNKNOWN
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), source);
      throw error;
    }
  };
}