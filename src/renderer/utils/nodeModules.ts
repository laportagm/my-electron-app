/**
 * Safe access to Node.js modules in the renderer process
 * 
 * These are exposed via the preload script and window.electron
 */

// Path module safe methods
export const path = {
  join: (...args: string[]): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.join(...args);
    }
    // Fallback implementation for browser preview
    return args.join('/').replace(/\/+/g, '/');
  },
  
  resolve: (...args: string[]): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.resolve(...args);
    }
    // Fallback implementation
    return '/' + args.join('/').replace(/\/+/g, '/');
  },

  dirname: (pathString: string): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.dirname(pathString);
    }
    // Fallback implementation
    const parts = pathString.split('/');
    parts.pop();
    return parts.join('/') || '/';
  },

  basename: (pathString: string, ext?: string): string => {
    if (window.electron && window.electron.path) {
      return window.electron.path.basename(pathString, ext);
    }
    // Fallback implementation
    const base = pathString.split('/').pop() || '';
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  }
};

// FS module safe methods
export const fs = {
  existsSync: (path: string): boolean => {
    if (window.electron && window.electron.fs) {
      return window.electron.fs.existsSync(path);
    }
    // Fallback for browser (always false)
    return false;
  },
  
  readFile: async (path: string): Promise<string> => {
    if (window.electron) {
      return window.electron.readFile(path);
    }
    throw new Error('File system not available in browser');
  },
  
  writeFile: async (path: string, data: string): Promise<boolean> => {
    if (window.electron) {
      return window.electron.writeFile(path, data);
    }
    throw new Error('File system not available in browser');
  }
};

// OS module safe methods
export const os = {
  platform: (): string => {
    if (window.electron && window.electron.os) {
      return window.electron.os.platform();
    }
    // Fallback for browser
    return 'browser';
  },
  
  homedir: (): string => {
    if (window.electron && window.electron.os) {
      return window.electron.os.homedir();
    }
    // Fallback for browser
    return '/';
  }
};
