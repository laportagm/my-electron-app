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
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="relative bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-md border border-white/20 dark:border-gray-700/50 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift"></div>

        {/* Animated rings */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-brain-blue/20 rounded-full animate-ping-slow opacity-20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-brain-pink/20 rounded-full animate-ping-slow opacity-20" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Brain icon with glow effect */}
        <div className="relative mb-6 mt-2">
          <div className="absolute inset-0 bg-brain-pink/20 rounded-full filter blur-xl animate-pulse-subtle"></div>
          <div className="animate-float">
            <Brain size={56} className="text-brain-pink drop-shadow-brain" />
          </div>
        </div>

        <div className="flex flex-col items-center w-full z-10">
          <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-100">
            Loading {currentModelName || 'Brain Model'}
          </h3>

          {/* Progress bar with animated gradient */}
          <div className="w-full h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden my-2 backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-brain-blue via-brain-purple to-brain-pink relative"
              style={{ width: `${progressValue}%` }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
            </div>
          </div>

          {/* Progress information with animated dots */}
          <div className="flex w-full justify-between text-sm text-gray-600 dark:text-gray-300 mt-2 mb-4">
            <span className="font-mono font-semibold">{Math.round(progressValue)}%</span>
            <span className="flex items-center">
              {progressMessage}
              <span className="inline-flex ml-1">
                <span className="animate-dot-1">.</span>
                <span className="animate-dot-2">.</span>
                <span className="animate-dot-3">.</span>
              </span>
            </span>
          </div>

          {/* Status message */}
          <div className="w-full p-3 bg-gray-100/70 dark:bg-gray-700/30 rounded-lg border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Please wait while the high-resolution model loads.
              <br />
              <span className="text-xs opacity-75 block mt-1">This may take a few moments for detailed models.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
