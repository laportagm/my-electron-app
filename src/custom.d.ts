/**
 * Custom declarations for the project
 */
import * as THREE from 'three';

declare module '@react-three/fiber' {
  interface ThreeElements {
    group: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    > &
      JSX.IntrinsicElements['group'] & {
        ref?: React.RefObject<THREE.Group>;
      };
  }
}

// Fix for nullable setCurrentModelRef parameters
interface ModelRefProps {
  setCurrentModelRef: (ref: THREE.Group | null) => void;
}

// Allow LLM lazy loading - module path must match the import path
// We use a completely different name for the component to avoid conflicts
declare module '../renderer/components/chat/ChatUI' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}