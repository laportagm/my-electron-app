import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import * as THREE from 'three'

// Helper to prevent unnecessary re-renders
const shallowEqual = (objA: any, objB: any) => {
  if (objA === objB) return true;
  if (!objA || !objB) return false;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (objA[key] !== objB[key]) return false;
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
  isLoading: boolean
  cache: Record<string, THREE.Group>
  currentModelRef: THREE.Group | null
  orbitControlsRef: any | null
  cameraRef: THREE.PerspectiveCamera | null
  setSelected: (id: string | null) => void
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
  togglePanel: () => void
  toggleTheme: () => void
}

interface QuizSlice {
  running: boolean
  history: QuizResult[]
  startQuiz: () => void
  record: (r: QuizResult) => void
}

type AppState = ModelsSlice & UiSlice & QuizSlice

/* ──────────── Store ──────────── */
export { AppState }
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* models */
      selectedId: null,
      isLoading: false,
      cache: {},
      currentModelRef: null,
      orbitControlsRef: null,
      cameraRef: null,
      setSelected: (id) => {
        const state = get();
        // Only update if the ID actually changes to prevent unnecessary re-renders
        if (id !== state.selectedId) {
          set({ selectedId: id });
        }
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
      togglePanel: () => set((s) => ({ sidePanelOpen: !s.sidePanelOpen })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      /* quiz */
      running: false,
      history: [],
      startQuiz: () => set({ running: true }),
      record: (r) =>
        set((s) => ({
          running: false,
          history: [...s.history, r]
        }))
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these values
        theme: state.theme,
        history: state.history,
        sidePanelOpen: state.sidePanelOpen,
        selectedId: state.selectedId
      })
    }
  )
)

/* ──────────── Helper export ──────────── */
export { shallow }
