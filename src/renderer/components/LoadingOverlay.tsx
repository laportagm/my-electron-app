import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Brain } from 'lucide-react';
import { getModelById } from '@/utils/modelRegistry';

const LoadingOverlay = () => {
  const isLoading = useAppStore((s) => s.isLoading);
  const selectedId = useAppStore((s) => s.selectedId);
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Initializing...');
  const [currentModelName, setCurrentModelName] = useState('');
  
  // Get model name when selected ID changes
  useEffect(() => {
    if (selectedId) {
      // Use proper ES imports instead of require
      const model = getModelById(selectedId);
      if (model) {
        setCurrentModelName(model.name);
      }
    }
  }, [selectedId]);
  
  // Simulate progress for better UX
  useEffect(() => {
    if (!isLoading) {
      // Reset progress when not loading
      setProgressValue(0);
      return;
    }
    
    // Reset progress when loading starts
    setProgressValue(0);
    setProgressMessage('Initializing...');
    
    const progressInterval = setInterval(() => {
      setProgressValue((prev) => {
        // Update progress messages based on progress value
        if (prev < 30) {
          setProgressMessage('Loading model data...');
        } else if (prev < 60) {
          setProgressMessage('Processing model geometry...');
        } else if (prev < 80) {
          setProgressMessage('Preparing high-resolution textures...');
        } else {
          setProgressMessage('Finalizing...');
        }
        
        // Progress should increase smoothly but never reach 100% until actually loaded
        // This makes it feel responsive even if loading takes time
        if (prev < 95) {
          return prev + (Math.random() * 2);
        }
        return prev;
      });
    }, 200);
    
    return () => clearInterval(progressInterval);
  }, [isLoading]);
  
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
              style={{ width: `${progressValue}%` }}
            ></div>
          </div>
          <div className="flex w-full justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{Math.round(progressValue)}%</span>
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
};

export default LoadingOverlay;
