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
}
