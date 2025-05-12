import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import * as THREE from 'three'
import { ApplicationError } from '@/utils/errorHandler'
import { Annotation, Vector3, AnnotationSlice } from '@/components/annotations/types'

// Helper to prevent unnecessary re-renders
const shallowEqual = (objA: any, objB: any) => {
  if (objA === objB) return true;
  if (!objA || !objB) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (key !== undefined && objA[key] !== objB[key]) return false;
  }

  return true;
};

/* ──────────── Types ──────────── */
export interface QuizResult {
  id: string
  correct: boolean
  ms: number
  timestamp: number
}

interface ModelsSlice {
  selectedId: string | null
  selectedIds: string[] // Support for multi-model selection
  showMultiple: boolean // Flag to indicate if multiple models should be shown
  isLoading: boolean
  cache: Record<string, THREE.Group>
  currentModelRef: THREE.Group | null
  orbitControlsRef: any | null
  cameraRef: THREE.PerspectiveCamera | null
  setSelected: (id: string | null) => void
  setMultipleSelected: (ids: string[]) => void // New function to set multiple models
  toggleMultipleMode: (enabled: boolean) => void // Toggle multiple models mode
  addToCache: (id: string, group: THREE.Group) => void
  setLoading: (loading: boolean) => void
  setCurrentModelRef: (ref: THREE.Group | null) => void
  setOrbitControlsRef: (ref: any) => void
  setCameraRef: (ref: THREE.PerspectiveCamera | null) => void
  resetView: () => void
  focusOnModel: () => void
  clearCache: () => void
}

interface UiSlice {
  theme: 'light' | 'dark'
  sidePanelOpen: boolean
  showPerformanceMonitor: boolean
  showControlPanel: boolean
  togglePanel: () => void
  toggleTheme: () => void
  togglePerformanceMonitor: () => void
  toggleControlPanel: () => void
}

interface QuizSlice {
  running: boolean
  history: QuizResult[]
  startQuiz: () => void
  record: (r: QuizResult) => void
}

interface ErrorSlice {
  errors: ApplicationError[]
  lastError: ApplicationError | null
  addError: (error: ApplicationError) => void
  clearErrors: () => void
  dismissError: (timestamp: number) => void
}

type AppState = ModelsSlice & UiSlice & QuizSlice & ErrorSlice & AnnotationSlice

/* ──────────── Store ──────────── */
/* ──────────── Selectors ──────────── */
// Type-safe selectors for better component performance
export const selectors = {
  // Model selectors
  selectedId: (state: AppState) => state.selectedId,
  selectedIds: (state: AppState) => state.selectedIds,
  showMultiple: (state: AppState) => state.showMultiple,
  isLoading: (state: AppState) => state.isLoading,
  currentModelRef: (state: AppState) => state.currentModelRef,
  orbitControlsRef: (state: AppState) => state.orbitControlsRef,
  cameraRef: (state: AppState) => state.cameraRef,

  // UI selectors
  theme: (state: AppState) => state.theme,
  sidePanelOpen: (state: AppState) => state.sidePanelOpen,
  showPerformanceMonitor: (state: AppState) => state.showPerformanceMonitor,
  showControlPanel: (state: AppState) => state.showControlPanel,

  // Error selectors
  lastError: (state: AppState) => state.lastError,
  errors: (state: AppState) => state.errors,

  // Quiz selectors
  quizRunning: (state: AppState) => state.running,
  quizHistory: (state: AppState) => state.history,

  // Action selectors
  modelActions: (state: AppState) => ({
    setSelected: state.setSelected,
    setMultipleSelected: state.setMultipleSelected,
    toggleMultipleMode: state.toggleMultipleMode,
    resetView: state.resetView,
    focusOnModel: state.focusOnModel,
  }),

  uiActions: (state: AppState) => ({
    togglePanel: state.togglePanel,
    toggleTheme: state.toggleTheme,
    togglePerformanceMonitor: state.togglePerformanceMonitor,
    toggleControlPanel: state.toggleControlPanel,
  }),
};

// Specialized compound selectors with shallow equality
export const useModelSelectionState = () =>
  useAppStore((state: AppState) => ({
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    showMultiple: state.showMultiple,
  }));

export const useModelDisplayState = () =>
  useAppStore((state: AppState) => ({
    isLoading: state.isLoading,
    currentModelRef: state.currentModelRef,
  }));

export const useCameraControls = () =>
  useAppStore((state: AppState) => ({
    orbitControlsRef: state.orbitControlsRef,
    cameraRef: state.cameraRef,
    resetView: state.resetView,
    focusOnModel: state.focusOnModel,
  }));

export type { AppState }
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* models */
      selectedId: null,
      selectedIds: [], // Initialize empty array for multiple selections
      showMultiple: false, // Default to single model mode
      isLoading: false,
      cache: {},
      currentModelRef: null,
      orbitControlsRef: null,
      cameraRef: null,

      /* annotations */
      annotations: {},
      selectedAnnotationId: null,
      isCreating: false,
      setSelected: (id) => {
        const state = get();
        // Only update if the ID actually changes to prevent unnecessary re-renders
        if (id !== state.selectedId) {
          set({
            selectedId: id,
            selectedIds: id ? [id] : [], // Reset multiple selections when selecting a single model
            showMultiple: false // Turn off multiple mode when selecting a single model
          });
        }
      },
      setMultipleSelected: (ids) => {
        const state = get();
        // Only update if the array actually changes
        if (JSON.stringify(ids) !== JSON.stringify(state.selectedIds)) {
          set({
            selectedIds: ids,
            selectedId: ids.length > 0 ? ids[0] : null, // Set the first ID as the primary selection
            showMultiple: true // Turn on multiple mode
          });
        }
      },
      toggleMultipleMode: (enabled) => {
        set({ showMultiple: enabled });
      },
      addToCache: (id, group) => set((state) => ({ 
        cache: { ...state.cache, [id]: group } 
      })),
      clearCache: () => set({ cache: {} }),
      setLoading: (loading) => set({ isLoading: loading }),
      setCurrentModelRef: (ref) => {
        // Only update if the reference actually changes to prevent loops
        const state = get();
        if (ref !== state.currentModelRef) {
          set({ currentModelRef: ref });
        }
      },
      setOrbitControlsRef: (ref) => {
        const state = get();
        if (ref !== state.orbitControlsRef) {
          set({ orbitControlsRef: ref });
        }
      },
      setCameraRef: (ref) => {
        const state = get();
        if (ref !== state.cameraRef) {
          set({ cameraRef: ref });
        }
      },
      
      resetView: () => {
        const state = get();
        if (state.orbitControlsRef) {
          state.orbitControlsRef.reset();
        }
      },
      
      focusOnModel: () => {
        const state = get();
        if (state.currentModelRef && state.orbitControlsRef && state.cameraRef) {
          // Calculate the bounding box of the model
          const box = new THREE.Box3().setFromObject(state.currentModelRef);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Calculate distance based on model size and camera FOV
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = state.cameraRef.fov * (Math.PI / 180);
          const distance = maxDim / (2 * Math.tan(fov / 2));
          
          // Set the orbit controls target to the center of the model
          state.orbitControlsRef.target.copy(center);
          
          // Position the camera
          state.cameraRef.position.copy(center);
          state.cameraRef.position.z += distance * 1.5; // Adjust for better view
          
          // Update the camera and controls
          state.cameraRef.updateProjectionMatrix();
          state.orbitControlsRef.update();
        }
      },

      /* ui */
      theme: 'light',
      sidePanelOpen: true, // Changed to true so panel is open by default
      showPerformanceMonitor: false, // Default to hidden
      showControlPanel: false, // Default to hidden
      togglePanel: () => set((s) => ({ sidePanelOpen: !s.sidePanelOpen })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      togglePerformanceMonitor: () => set((s) => ({ showPerformanceMonitor: !s.showPerformanceMonitor })),
      toggleControlPanel: () => set((s) => ({ showControlPanel: !s.showControlPanel })),

      /* quiz */
      running: false,
      history: [],
      startQuiz: () => set({ running: true }),
      record: (r) =>
        set((s) => ({
          running: false,
          history: [...s.history, r]
        })),
        
      /* errors */
      errors: [],
      lastError: null,
      addError: (error) => set((state) => {
        const newErrors = [...state.errors, error];
        // Keep only the most recent 10 errors
        if (newErrors.length > 10) {
          newErrors.shift();
        }
        return {
          errors: newErrors,
          lastError: error
        };
      }),
      clearErrors: () => set({ errors: [], lastError: null }),
      dismissError: (timestamp) => set((state) => {
        const newErrors = state.errors.filter(e => e.timestamp !== timestamp);
        return {
          errors: newErrors,
          lastError: newErrors.length > 0 ? newErrors[newErrors.length - 1] : null
        };
      }),

      /* annotation methods */
      addAnnotation: (annotation) => set((state) => {
        const id = `annotation-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const now = Date.now();

        return {
          annotations: {
            ...state.annotations,
            [id]: {
              ...annotation,
              id,
              created_at: now,
              updated_at: now
            }
          },
          selectedAnnotationId: id,
          isCreating: false
        };
      }),

      updateAnnotation: (id, data) => set((state) => {
        if (!state.annotations[id]) return state;

        return {
          annotations: {
            ...state.annotations,
            [id]: {
              ...state.annotations[id],
              ...data,
              updated_at: Date.now()
            }
          }
        };
      }),

      deleteAnnotation: (id) => set((state) => {
        const newAnnotations = { ...state.annotations };
        delete newAnnotations[id];

        return {
          annotations: newAnnotations,
          selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId
        };
      }),

      selectAnnotation: (id) => set({
        selectedAnnotationId: id,
        isCreating: false
      }),

      toggleCreationMode: () => set((state) => ({
        isCreating: !state.isCreating,
        selectedAnnotationId: null
      })),

      loadAnnotations: async (modelId) => {
        // In a real implementation, this would load from a database or API
        // For now, this is a placeholder that just returns the existing annotations
        // Do nothing as we're already persisting to localStorage
      }
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these values
        theme: state.theme,
        history: state.history,
        sidePanelOpen: state.sidePanelOpen,
        selectedId: state.selectedId,
        annotations: state.annotations,
        showPerformanceMonitor: state.showPerformanceMonitor,
        showControlPanel: state.showControlPanel
      })
    }
  )
)

/* ──────────── Helper export ──────────── */
export { shallow }
