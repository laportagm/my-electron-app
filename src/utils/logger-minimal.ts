/**
 * Simplified logger for the prototype version
 */

export const logger = {
  info: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} › ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.warn(`${timestamp} › ${message}`, ...args);
  },
  
  error: (message: string, error?: Error) => {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} › ${message}`, error || '');
  },
  
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`${timestamp} › ${message}`, ...args);
    }
  }
};

/**
 * Handle errors in a consistent way
 */
export function handleError(error: Error, context: string): void {
  logger.error(`${context}: ${error.message}`);
  if (error.stack) {
    logger.debug(error.stack);
  }
}