import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { brainModels } from '@/utils/modelRegistry';
import { diagnoseModelLoading, fixModelPaths } from '@/utils/modelDiagnostics';

/**
 * A debugging component that shows the current state
 */
const DebugPanel = () => {
  const [expanded, setExpanded] = useState(false);
  const [modelFilesStatus, setModelFilesStatus] = useState<{[key: string]: boolean}>({});
  const [diagnosticResults, setDiagnosticResults] = useState<{[key: string]: any}>({});
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  
  const sidePanelOpen = useAppStore(state => state.sidePanelOpen);
  const selectedId = useAppStore(state => state.selectedId);
  const isLoading = useAppStore(state => state.isLoading);
  const currentModelRef = useAppStore(state => state.currentModelRef);
  const hasModel = !!currentModelRef;
  
  // Check if model files exist
  useEffect(() => {
    const checkModelFiles = async () => {
      const results: {[key: string]: boolean} = {};
      
      for (const model of brainModels) {
        try {
          const response = await fetch(model.lowPolyUrl, { method: 'HEAD' });
          results[model.id] = response.ok;
        } catch (e) {
          console.error(`Failed to check model file: ${model.lowPolyUrl}`, e);
          results[model.id] = false;
        }
      }
      
      setModelFilesStatus(results);
    };
    
    if (expanded) {
      checkModelFiles();
    }
  }, [expanded]);
  
  const toggleExpanded = () => setExpanded(!expanded);
  
  const forceLoadModel = () => {
    // Find a model that exists
    const firstModelId = brainModels[0]?.id;
    if (firstModelId) {
      console.log('Force loading model:', firstModelId);
      useAppStore.getState().setSelected(firstModelId);
    }
  };
  
  const clearCacheAndReload = () => {
    // Clear localStorage
    localStorage.clear();
    // Clear Zustand store cache
    useAppStore.getState().clearCache();
    // Reload the app
    window.location.reload();
  };
  
  const runModelDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const results = await diagnoseModelLoading();
      setDiagnosticResults(results);
    } catch (e) {
      console.error('Error running diagnostics:', e);
    }
    setRunningDiagnostics(false);
  };
  
  const applyModelFixes = () => {
    if (Object.keys(diagnosticResults).length > 0) {
      fixModelPaths(diagnosticResults);
      // Force a reload of the selected model
      const currentId = selectedId;
      useAppStore.getState().setSelected(null);
      setTimeout(() => useAppStore.getState().setSelected(currentId), 100);
    }
  };
  
  const modelStatusCount = Object.values(modelFilesStatus).filter(Boolean).length;
  const diagModelCount = Object.keys(diagnosticResults)
    .filter(key => key !== 'dracoDecoderAvailable' && diagnosticResults[key]?.loaded)
    .length;
  
  return (
    <div className={`fixed ${expanded ? 'bottom-0 right-0 w-96 max-h-[80vh]' : 'bottom-4 left-4'} bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg ${expanded ? 'text-sm' : 'text-xs'} z-50 ${expanded ? '' : 'opacity-90'} overflow-auto`}>
      {expanded ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Debug Panel</h3>
            <button onClick={toggleExpanded} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
              ⨯
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="font-medium">Side Panel:</div>
            <div className={sidePanelOpen ? 'text-green-500' : 'text-red-500'}>
              {sidePanelOpen ? 'Open' : 'Closed'}
            </div>
            
            <div className="font-medium">Selected ID:</div>
            <div>{selectedId || 'None'}</div>
            
            <div className="font-medium">Loading:</div>
            <div className={isLoading ? 'text-yellow-500' : 'text-green-500'}>
              {isLoading ? 'Yes' : 'No'}
            </div>
            
            <div className="font-medium">Has Model:</div>
            <div className={hasModel ? 'text-green-500' : 'text-red-500'}>
              {hasModel ? 'Yes' : 'No'}
            </div>
            
            {hasModel && (
              <>
                <div className="font-medium">Model Children:</div>
                <div>{currentModelRef?.children.length || 0}</div>
              </>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-1">Model Files Status</h4>
            <div className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-48 overflow-y-auto">
              <div className="mb-1 font-medium">
                Found {modelStatusCount} of {brainModels.length} models
              </div>
              {brainModels.map(model => (
                <div key={model.id} className="flex justify-between">
                  <span>{model.name}</span>
                  <span className={modelFilesStatus[model.id] ? 'text-green-500' : 'text-red-500'}>
                    {modelFilesStatus[model.id] ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {Object.keys(diagnosticResults).length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Diagnostic Results</h4>
              <div className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-48 overflow-y-auto">
                <div className="mb-1 font-medium">
                  Loaded {diagModelCount} of {brainModels.length} models
                </div>
                <div className="mb-1">
                  Draco Decoder: {diagnosticResults.dracoDecoderAvailable ? '✅ Available' : '❌ Not Found'}
                </div>
                {Object.keys(diagnosticResults)
                  .filter(key => key !== 'dracoDecoderAvailable')
                  .map(modelId => {
                    const result = diagnosticResults[modelId];
                    return (
                      <div key={modelId} className="flex justify-between">
                        <span>{modelId}</span>
                        <span className={result.loaded ? 'text-green-500' : 'text-red-500'}>
                          {result.loaded ? '✅ Loaded' : result.found ? '⚠️ Found but error' : '❌ Not found'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap space-x-2 space-y-2">
            <button 
              onClick={clearCacheAndReload}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
            >
              Clear Cache & Reload
            </button>
            
            <button 
              onClick={forceLoadModel}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
            >
              Force Load Model
            </button>
            
            <button 
              onClick={() => useAppStore.getState().togglePanel()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
            >
              Toggle Side Panel
            </button>
            
            <button 
              onClick={runModelDiagnostics}
              disabled={runningDiagnostics}
              className={`${runningDiagnostics ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white px-2 py-1 rounded text-xs`}
            >
              {runningDiagnostics ? 'Running...' : 'Run Diagnostics'}
            </button>
            
            {Object.keys(diagnosticResults).length > 0 && (
              <button 
                onClick={applyModelFixes}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
              >
                Apply Path Fixes
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="font-medium">ID:</div>
            <div>{selectedId || 'None'}</div>
            
            <div className="font-medium">Model:</div>
            <div className={hasModel ? 'text-green-500' : 'text-red-500'}>
              {hasModel ? 'Yes' : 'No'}
            </div>
          </div>
          
          <button
            onClick={toggleExpanded}
            className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
          >
            Expand
          </button>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
