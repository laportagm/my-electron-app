import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import { useAppStore } from '@/store/useAppStore';
import { ErrorSource } from '@/utils/errorHandler';
import * as THREE from 'three';

interface ModelLoadingErrorBoundaryProps {
  children: React.ReactNode;
  modelId?: string;
}

/**
 * Specialized error boundary for handling model loading errors
 * Shows a fallback cube and error message with retry option
 */
export const ModelLoadingErrorBoundary: React.FC<ModelLoadingErrorBoundaryProps> = ({
  children,
  modelId,
}) => {
  const addError = useAppStore(state => state.addError);

  const handleError = (error: Error) => {
    // Add the error to the global error state
    addError({
      message: `Failed to load model${modelId ? ` (${modelId})` : ''}: ${error.message}`,
      timestamp: Date.now(),
      source: ErrorSource.MODEL_LOADING
    });
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={(error, resetError) => (
        <div className="model-error-container relative w-full h-full">
          {/* Show the fallback cube */}
          <mesh scale={[0.7, 0.7, 0.7]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ff0000" />
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
              <lineBasicMaterial color="#ffffff" />
            </lineSegments>
          </mesh>
          
          {/* Overlay error message */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 max-w-md w-full p-4 bg-red-50 dark:bg-red-900/70 border border-red-200 dark:border-red-800 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-1">Model Loading Error</h3>
            <p className="mb-3 text-sm text-red-600 dark:text-red-200">
              {error.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={resetError}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ModelLoadingErrorBoundary;