/**
 * Global type definitions for browser window extensions
 */

interface Window {
  // Path module extension (polyfilled or from preload)
  path?: {
    join: (...paths: string[]) => string;
    resolve: (...paths: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string, ext?: string) => string;
    extname: (path: string) => string;
    normalize?: (path: string) => string;
    sep: string;
    delimiter?: string;
  };
  
  // Electron API extension (from preload)
  electron?: {
    // IPC communication
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    
    // Node.js path module exposed through preload
    path: {
      join: (...paths: string[]) => string;
      resolve: (...paths: string[]) => string;
      dirname: (path: string) => string;
      basename: (path: string, ext?: string) => string;
      extname: (path: string) => string;
      sep: string;
    };
    
    // Limited file system access
    fs: {
      existsSync: (path: string) => boolean;
    };
    
    // OS info
    os: {
      platform: () => string;
      homedir: () => string;
      tmpdir: () => string;
    };
    
    // Logging
    log?: (level: string, message: string, ...args: any[]) => void;
    sendError?: (message: string, stack?: string) => void;
  };
  
  // Global object for Node.js compatibility
  global?: typeof globalThis;
}

// Augment process for browser polyfill
interface Process {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  };
  cwd?: () => string;
  versions?: {
    node?: string;
    electron?: string;
    chrome?: string;
  };
  type?: 'browser' | 'renderer';
}

// Make process available globally
declare let process: Process;

// Make __dirname and __filename available in ESM
declare let __dirname: string;
declare let __filename: string;