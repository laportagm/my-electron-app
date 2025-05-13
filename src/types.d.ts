/// <reference types="react" />
/// <reference types="react-dom" />

/**
 * Global TypeScript declarations to ensure React types are available
 */

// ThreeJS animation types for better typing
declare namespace THREE {
  interface WebGLRenderer {
    setAnimationLoop(callback: ((timestamp: number) => void) | null): void;
  }

  // Extended material types
  interface Material {
    dispose(): void;
  }

  interface Texture {
    dispose(): void;
  }

  // This allows us to type-check material properties
  interface MeshBasicMaterial extends Material {
    map: Texture | null;
  }

  interface MeshStandardMaterial extends Material {
    map: Texture | null;
    normalMap: Texture | null;
    roughnessMap: Texture | null;
    metalnessMap: Texture | null;
    envMap: Texture | null;
  }
}

// Make JSX namespace available globally
import React from 'react';
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass extends React.Component<any> {
      render(): React.ReactNode;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }

  // Global interface extensions
  interface Window {
    dracoDecoderPath: string;
    electron?: {
      // IPC communication
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, listener: (...args: any[]) => void) => void;

      // Node.js path module
      path: {
        join: (...paths: string[]) => string;
        resolve: (...paths: string[]) => string;
        dirname: (path: string) => string;
        basename: (path: string, ext?: string) => string;
        extname: (path: string) => string;
        sep: string;
      };

      // File system access (limited subset)
      fs: {
        existsSync: (path: string) => boolean;
      };

      // OS info
      os: {
        platform: () => string;
        homedir: () => string;
        tmpdir: () => string;
      };

      // Additional properties from import('./renderer/electron').default
      [key: string]: any;
    };
  }
}