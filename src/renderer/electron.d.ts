/**
 * Electron API types for browser compatibility
 */

interface ElectronAPI {
  ipcRenderer?: {
    on: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    removeAllListeners: (channel: string) => void;
  };

  // Path module
  path: {
    join: (...paths: string[]) => string;
    resolve: (...paths: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string, ext?: string) => string;
    extname: (path: string) => string;
    sep: string;
  };

  // File system
  fs: {
    existsSync: (path: string) => boolean;
  };

  // OS
  os: {
    platform: () => string;
    homedir: () => string;
    tmpdir: () => string;
  };

  getPath: (name: string) => string | Promise<string>;
  isPackaged: boolean;
  readDir: (path: string) => Promise<string[]>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<boolean>;

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;

  // LLM download
  downloadModel: (url: string, filename: string) => Promise<{success: boolean, path: string, alreadyExists: boolean}>;

  log: (level: string, message: string, ...args: any[]) => void;

  llm: {
    loadModel: (modelName: string, systemPrompt: string) => Promise<{success: boolean, error?: string}>;
    isLoaded: () => Promise<boolean>;
    getAvailableModels: () => Promise<string[]>;
    generate: (prompt: string) => Promise<{success: boolean, response?: string, error?: string}>;
    resetChat: (systemPrompt: string) => Promise<{success: boolean, error?: string}>;
  };
}

// Global window interface
declare global {
  interface Window {
    electron: ElectronAPI;
    path: {
      join: (...paths: string[]) => string;
      resolve: (...paths: string[]) => string;
      dirname: (path: string) => string;
      basename: (path: string, ext?: string) => string;
      extname: (path: string) => string;
      sep: string;
    };
  }
}

declare const electron: ElectronAPI;
export default electron;
