/**
 * TypeScript declarations for polyfills.js
 */

declare global {
  var __dirname: string;
  var __filename: string;
  
  interface Process {
    env: {
      NODE_ENV: string;
      [key: string]: string | undefined;
    };
    cwd: () => string;
  }
  
  var process: Process;
}

export {};