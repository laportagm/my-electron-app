import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Brain, Lightbulb, ArrowRight, X } from 'lucide-react';

interface WelcomeProps {
  onClose: () => void;
}

/**
 * Welcome component that guides first-time users through the application
 */
const Welcome: React.FC<WelcomeProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [animation, setAnimation] = useState('');
  const totalSteps = 4;
  
  // References to functions needed during the tour
  const focusOnModel = useAppStore(state => state.focusOnModel);
  const togglePanel = useAppStore(state => state.togglePanel);
  
  // Set animation when step changes
  useEffect(() => {
    setAnimation('animate-fade-in');
    const timer = setTimeout(() => setAnimation(''), 500);
    return () => clearTimeout(timer);
  }, [step]);
  
  // Move to next step
  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };
  
  // Helper for progress indicators
  const ProgressIndicator = () => (
    <div className="flex justify-center space-x-1 mt-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div 
          key={index} 
          className={`h-1.5 rounded-full transition-all ${
            index + 1 === step ? 'w-8 bg-blue-500' : 'w-4 bg-gray-300 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="absolute top-4 right-4">
        <button 
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Close welcome guide"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full">
        <div className={`${animation} transition-all duration-300`}>
          {step === 1 && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Brain size={40} className="text-blue-500 animate-pulse-subtle" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                Welcome to Brain Anatomy Visualizer
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                An interactive 3D tool for exploring brain anatomy with precision and detail.
              </p>
            </>
          )}
          
          {step === 2 && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 animate-float">
                    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                Interactive 3D Navigation
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Click and drag to rotate the model. Scroll to zoom in and out. Use the camera controls for precision viewing.
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">
                <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                  <Lightbulb size={16} className="text-yellow-500 mr-2 flex-shrink-0" />
                  <span>Try the <strong>Focus</strong> button to center on specific structures.</span>
                </div>
              </div>
            </>
          )}
          
          {step === 3 && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 animate-spin-slow">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                Explore Different Models
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Use the side panel to browse and select different brain structures. You can view individual parts or entire systems.
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">
                <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                  <Lightbulb size={16} className="text-yellow-500 mr-2 flex-shrink-0" />
                  <span>Try the <strong>Groups</strong> tab to view multiple related structures together.</span>
                </div>
              </div>
              <button 
                onClick={() => togglePanel()}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open Models Panel
              </button>
            </>
          )}
          
          {step === 4 && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                Ready to Begin?
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                You can access this guide anytime from the help menu. Don't forget to try the AI Assistant for questions about brain anatomy!
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">
                <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                  <Lightbulb size={16} className="text-yellow-500 mr-2 flex-shrink-0" />
                  <span>Press <strong>?</strong> at any time to view keyboard shortcuts.</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        <ProgressIndicator />
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={nextStep}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {step === totalSteps ? 'Get Started' : 'Next'}
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;