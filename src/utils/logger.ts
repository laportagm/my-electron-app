import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

// Configure electron-log
log.transports.file.resolvePathFn = () => path.join(
  app.getPath('userData'),
  'logs/main.log'
);

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

export const logger = {
  info: (message: string, ...args: any[]) => log.info(message, ...args),
  error: (message: string, error?: Error, ...args: any[]) => {
    if (error) {
      log.error(message, error.message, error.stack, ...args);
    } else {
      log.error(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => log.warn(message, ...args),
  debug: (message: string, ...args: any[]) => log.debug(message, ...args)
};

// Create error handler utility
export const handleError = (error: Error, context?: string): void => {
  logger.error(`${context || 'Application error'}:`, error);
  // Add error reporting to external service if needed
};