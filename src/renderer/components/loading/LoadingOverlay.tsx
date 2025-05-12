import React, { useState, useEffect, useMemo } from 'react';
import { Brain } from 'lucide-react';
import { useAppStore, AppState } from '@/store/useAppStore';
import { getModelById } from '@/utils/modelRegistry';

/**
 * Progress messages by stage
 */
const PROGRESS_MESSAGES = [
  { threshold: 0, message: 'Initializing...' },
  { threshold: 30, message: 'Loading model data...' },
  { threshold: 60, message: 'Processing model geometry...' },
  { threshold: 80, message: 'Preparing high-resolution textures...' },
  { threshold: 95, message: 'Finalizing...' }
];

/**
 * Loading indicator that shows progress for model loading
 * Uses simulated progress for better UX when actual progress is unavailable
 */
const LoadingOverlay: React.FC = React.memo(() => {
  // Use direct store access for simplicity
  const isLoading = useAppStore((state: AppState) => state.isLoading);
  const selectedId = useAppStore((state: AppState) => state.selectedId);
  
  // Local state
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState(PROGRESS_MESSAGES[0]?.message || 'Initializing...');

  // Get model name based on selected ID
  const currentModelName = useMemo(() => {
    if (!selectedId) return '';
    const model = getModelById(selectedId);
    return model?.name || '';
  }, [selectedId]);
  
  // Effect to manage simulated progress
  useEffect(() => {
    if (!isLoading) {
      setProgressValue(0);
      return undefined;
    }
    
    // Reset progress when loading starts
    setProgressValue(0);
    setProgressMessage(PROGRESS_MESSAGES[0]?.message || 'Initializing...');
    
    // Create interval to simulate loading progress
    const progressInterval = setInterval(() => {
      setProgressValue((prev) => {
        // Update message based on progress threshold
        const newProgress = prev < 95 ? prev + (Math.random() * 2) : prev;
        
        // Find appropriate message based on progress value
        const messageObj = [...PROGRESS_MESSAGES]
          .reverse()
          .find(item => newProgress >= item.threshold);
          
        if (messageObj) {
          setProgressMessage(messageObj.message);
        }
        
        return newProgress;
      });
    }, 200);
    
    // Clean up interval when component unmounts or loading completes
    return () => clearInterval(progressInterval);
  }, [isLoading]);
  
  // Don't render anything if not loading
  if (!isLoading) return null;
  
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col items-center max-w-md">
        <div className="animate-pulse mb-4">
          <Brain size={48} className="text-brain-pink" />
        </div>
        <div className="flex flex-col items-center w-full">
          <h3 className="text-lg font-medium mb-2">
            Loading {currentModelName || 'Brain Model'}
          </h3>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden my-2">
            <div 
              className="h-full bg-gradient-to-r from-brain-blue to-brain-pink transition-all duration-300 ease-out"
              style={{ width: `${progressValue || 0}%` }}
            ></div>
          </div>
          <div className="flex w-full justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{Math.round(progressValue || 0)}%</span>
            <span>{progressMessage}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
            Please wait while the high-resolution model loads.
            <br />
            <span className="text-xs opacity-75">This may take a few moments for detailed models.</span>
          </p>
        </div>
      </div>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

export default LoadingOverlay;