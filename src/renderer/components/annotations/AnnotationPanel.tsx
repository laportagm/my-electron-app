import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Map, Edit, Trash2, PlusCircle, X, Check, Target, Tag, Clock, Info } from 'lucide-react';
import { Annotation } from './types';

interface AnnotationPanelProps {
  modelId: string;
}

/**
 * Sidebar panel for viewing and editing annotations
 * Enhanced with glass-morphism styling and improved UX
 */
const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ modelId }) => {
  // Get annotation state from the store
  const annotations = useAppStore(state => Object.values(state.annotations)
    .filter(a => a.modelId === modelId));
  const selectedAnnotationId = useAppStore(state => state.selectedAnnotationId);
  const isCreating = useAppStore(state => state.isCreating);
  
  // Get annotation actions from the store
  const selectAnnotation = useAppStore(state => state.selectAnnotation);
  const addAnnotation = useAppStore(state => state.addAnnotation);
  const updateAnnotation = useAppStore(state => state.updateAnnotation);
  const deleteAnnotation = useAppStore(state => state.deleteAnnotation);
  const toggleCreationMode = useAppStore(state => state.toggleCreationMode);
  
  // Get camera and controls for focusing
  const cameraRef = useAppStore(state => state.cameraRef);
  const orbitControlsRef = useAppStore(state => state.orbitControlsRef);
  
  // Local state for editing
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');
  
  // Get the selected annotation if any
  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
  
  // Update the form when selected annotation changes
  useEffect(() => {
    if (selectedAnnotation) {
      setTitle(selectedAnnotation.title);
      setContent(selectedAnnotation.content);
      setFormError('');
    } else {
      setTitle('');
      setContent('');
    }
    
    // Exit edit mode when selection changes
    setEditMode(false);
  }, [selectedAnnotation]);
  
  // Save the current annotation
  const handleSave = () => {
    // Basic validation
    if (!title.trim()) {
      setFormError('Please enter a title for the annotation');
      return;
    }
    
    if (selectedAnnotationId) {
      updateAnnotation(selectedAnnotationId, { 
        title, 
        content,
        updated_at: Date.now()
      });
      setEditMode(false);
      setFormError('');
    }
  };
  
  // Delete the selected annotation
  const handleDelete = () => {
    if (selectedAnnotationId) {
      deleteAnnotation(selectedAnnotationId);
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    if (selectedAnnotation) {
      setTitle(selectedAnnotation.title);
      setContent(selectedAnnotation.content);
    }
    setEditMode(false);
    setFormError('');
  };
  
  // Focus the camera on the selected annotation
  const focusOnAnnotation = () => {
    if (selectedAnnotation && orbitControlsRef && cameraRef) {
      // Set orbit controls target to annotation position
      orbitControlsRef.target.set(
        selectedAnnotation.position.x,
        selectedAnnotation.position.y,
        selectedAnnotation.position.z
      );
      
      // Update controls
      orbitControlsRef.update();
    }
  };
  
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center text-gray-900 dark:text-gray-100">
          <Map size={18} className="mr-2 text-brain-blue" />
          Annotations
        </h3>
        
        <button
          onClick={toggleCreationMode}
          className={`p-1.5 rounded-full transition-all shadow-sm ${
            isCreating 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800'
          }`}
          title={isCreating ? 'Exit creation mode' : 'Create new annotation'}
        >
          {isCreating ? <Check size={16} /> : <PlusCircle size={16} />}
        </button>
      </div>
      
      {isCreating && (
        <div className="mb-4 p-3 bg-glass backdrop-blur-sm border border-green-200/50 dark:border-green-800/30 rounded-lg shadow-sm">
          <div className="flex items-center text-green-800 dark:text-green-200 text-sm mb-1 font-medium">
            <Target size={14} className="mr-1.5" />
            Creation Mode Active
          </div>
          <p className="text-xs text-green-700 dark:text-green-300">
            Click on the brain model to place an annotation. Press Esc to cancel.
          </p>
        </div>
      )}
      
      {selectedAnnotationId && selectedAnnotation ? (
        <div className="flex-1 overflow-y-auto">
          {editMode ? (
            // Edit form with glass-morphism styling
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-glass backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-lg 
                           text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  placeholder="Enter a descriptive title"
                />
                {formError && (
                  <p className="text-xs text-red-500 mt-1">{formError}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Notes</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-glass backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-lg 
                           text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                  placeholder="Add details about this structure..."
                />
              </div>
              
              {/* 3D coordinates info (read-only in edit mode) */}
              <div className="mt-1">
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">3D Position</label>
                <div className="bg-glass backdrop-blur-sm rounded-lg p-2 text-xs grid grid-cols-3 gap-2 border border-white/20 dark:border-gray-700/50">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500 dark:text-gray-400">X</span>
                    <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                      {selectedAnnotation.position.x.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500 dark:text-gray-400">Y</span>
                    <span className="font-mono font-medium text-green-600 dark:text-green-400">
                      {selectedAnnotation.position.y.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500 dark:text-gray-400">Z</span>
                    <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                      {selectedAnnotation.position.z.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm bg-glass backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 
                           rounded-lg hover:bg-gray-100/70 dark:hover:bg-gray-800/70 text-gray-800 dark:text-gray-200 shadow-sm"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            // View mode with glass-morphism styling
            <div>
              <div className="flex justify-between mb-4">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedAnnotation.title}</h4>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full shadow-sm transition-colors"
                    title="Edit annotation"
                  >
                    <Edit size={14} />
                  </button>
                  
                  <button
                    onClick={handleDelete}
                    className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full shadow-sm transition-colors"
                    title="Delete annotation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {/* 3D position coordinates */}
              <div className="mb-3 bg-glass backdrop-blur-sm rounded-lg p-2 text-xs grid grid-cols-3 gap-2 border border-white/20 dark:border-gray-700/50">
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 dark:text-gray-400">X</span>
                  <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                    {selectedAnnotation.position.x.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 dark:text-gray-400">Y</span>
                  <span className="font-mono font-medium text-green-600 dark:text-green-400">
                    {selectedAnnotation.position.y.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 dark:text-gray-400">Z</span>
                  <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                    {selectedAnnotation.position.z.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Contents with glass morphism styling */}
              <div className="bg-glass backdrop-blur-sm rounded-lg p-4 text-sm whitespace-pre-wrap border border-white/20 dark:border-gray-700/50 text-gray-800 dark:text-gray-200 shadow-md">
                {selectedAnnotation.content || (
                  <span className="text-gray-500 dark:text-gray-400 italic">No description provided.</span>
                )}
              </div>
              
              {/* Jump to annotation button */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {new Date(selectedAnnotation.updated_at).toLocaleString()}
                </div>
                
                <button 
                  onClick={focusOnAnnotation}
                  className="flex items-center px-2 py-1 text-xs bg-brain-blue text-white rounded hover:bg-brain-blue-dark transition-colors shadow-sm"
                >
                  <Target size={12} className="mr-1.5" />
                  Focus
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-4">
          {annotations.length > 0 ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-3">
                <Map size={32} className="text-blue-500" />
              </div>
              <p className="text-sm">Select an annotation on the model to view details.</p>
            </>
          ) : (
            <>
              <div className="bg-glass backdrop-blur-sm p-5 rounded-lg mb-4 border border-white/20 dark:border-gray-700/50 shadow-md">
                <Map size={32} className="text-brain-blue opacity-80 mb-1" />
                <p className="text-base text-gray-700 dark:text-gray-300 font-medium">No annotations yet</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create your first annotation to mark important points on the brain model
              </p>
              <button
                onClick={toggleCreationMode}
                className="px-3 py-2 bg-gradient-to-r from-brain-blue to-brain-blue-dark text-white 
                        rounded-lg hover:shadow-md transition-all text-sm flex items-center"
              >
                <PlusCircle size={16} className="mr-2" />
                Create Annotation
              </button>
            </>
          )}
        </div>
      )}
      
      {annotations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-2 flex items-center text-gray-800 dark:text-gray-200">
            <Tag size={14} className="mr-1.5 text-gray-500" />
            All Annotations ({annotations.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {annotations.map(annotation => (
              <button
                key={annotation.id}
                onClick={() => selectAnnotation(annotation.id)}
                className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-all ${
                  selectedAnnotationId === annotation.id
                    ? 'bg-glass backdrop-blur-sm border border-blue-400/30 shadow-md text-blue-700 dark:text-blue-300'
                    : 'bg-white/30 dark:bg-gray-800/30 border border-transparent hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:border-gray-200/50 dark:hover:border-gray-700/50'
                }`}
              >
                <div className="font-medium truncate">{annotation.title}</div>
                {annotation.content ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {annotation.content}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-gray-500 italic">
                    No description
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AnnotationPanel);