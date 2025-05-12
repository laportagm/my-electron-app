import * as THREE from 'three';

// Vector3 representation for serialization
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Annotation type that represents a point in 3D space with associated metadata
export interface Annotation {
  id: string;
  modelId: string;
  position: Vector3;
  title: string;
  content: string;
  color?: string;
  visible: boolean;
  created_at: number;
  updated_at: number;
}

// Annotation state for the store
export interface AnnotationSlice {
  annotations: Record<string, Annotation>;
  selectedAnnotationId: string | null;
  isCreating: boolean;
  
  // Add a new annotation
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => void;
  
  // Update an existing annotation
  updateAnnotation: (id: string, data: Partial<Annotation>) => void;
  
  // Delete an annotation
  deleteAnnotation: (id: string) => void;
  
  // Select an annotation
  selectAnnotation: (id: string | null) => void;
  
  // Toggle creation mode
  toggleCreationMode: () => void;
  
  // Load annotations for a specific model
  loadAnnotations: (modelId: string) => Promise<void>;
}

// Convert a Three.js Vector3 to a plain object for storage
export function toVector3Object(v: THREE.Vector3): Vector3 {
  return { x: v.x, y: v.y, z: v.z };
}

// Convert a plain object to a Three.js Vector3 for rendering
export function toThreeVector3(v: Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}