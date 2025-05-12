import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import TopToolbar from '@/components/TopToolbar'
import SidePanel from '@/components/SidePanel'
import StatusBar from '@/components/StatusBar'
import NeuroScene from '@/components/NeuroScene'
import ErrorBoundary from '@/components/ErrorBoundary'
import Welcome from '@/components/Welcome'
import { useAppStore } from '@/store/useAppStore'
import { brainModels } from '@/utils/modelRegistry'
import { initAssetManager } from '@/utils/assetManager'

// Components that will be lazy-loaded
const ChatPanel = React.lazy(() =>
  // Use ChatPanel for better UI experience
  import('../components/chat/ChatPanel')
    .catch(() => ({
      default: () => <div className="p-4">Chat feature not available in this build</div>
    }))
)

// Load optional components directly with better error handling
const CheatSheet = React.lazy(() =>
  import('../components/CheatSheet')
    .catch(() => ({
      default: () => <div className="p-4">Cheat sheet not available in this build</div>
    }))
)

const DebugPanel = React.lazy(() =>
  import('../components/DebugPanel')
    .catch(() => ({
      default: () => <div className="p-4">Debug panel not available in this build</div>
    }))
)

// Hook: toggle on '?' and close on 'Escape'
function useHelpToggle(): [boolean, () => void] {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(v => !v), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?') toggle()
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, open])

  return [open, () => setOpen(false)]
}

const Viewer = () => {
  const [showCheats, closeCheats] = useHelpToggle()
  const [showWelcome, setShowWelcome] = useState(false)

  // Initialize showChat with a default value from localStorage or false
  const [showChat, setShowChat] = useState(() => {
    try {
      const savedValue = localStorage.getItem('showChatAssistant');
      return savedValue ? JSON.parse(savedValue) : false;
    } catch (e) {
      console.error('Error reading showChat from localStorage:', e);
      return false;
    }
  });

  // Use individual selectors to prevent infinite loops
  const selectedId = useAppStore(state => state.selectedId)
  const setSelectedAction = useAppStore(state => state.setSelected)

  // Memoize the setSelected function
  const setSelected = useCallback((id: string) => {
    setSelectedAction(id)
  }, [setSelectedAction])

  // Toggle chat visibility and save to localStorage
  const toggleChat = useCallback(() => {
    setShowChat(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('showChatAssistant', JSON.stringify(newValue));
      } catch (e) {
        console.error('Error saving showChat to localStorage:', e);
      }
      return newValue;
    });
  }, []);

  // Check if this is the first visit
  useEffect(() => {
    try {
      const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
      if (!hasVisitedBefore) {
        setShowWelcome(true);
        localStorage.setItem('hasVisitedBefore', 'true');
      }
    } catch (e) {
      console.error('Error checking first visit:', e);
    }
  }, []);

  // Close welcome screen
  const closeWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  // Initialize the asset manager and select a default model on mount
  useEffect(() => {
    // Initialize asset manager
    initAssetManager().then(() => {
      console.log('Asset manager initialized');

      // Set a default model if none is selected
      if (!selectedId && brainModels.length > 0) {
        const defaultModel = brainModels[0];
        if (defaultModel) {
          console.log('Setting default model:', defaultModel.id);
          setSelected(defaultModel.id);
        }
      }
    }).catch(err => {
      console.error('Failed to initialize asset manager:', err);
    });
  }, [selectedId, setSelected]);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto] grid-cols-[1fr_auto_auto] overflow-hidden">
      <TopToolbar className="col-span-3" />

      <main className="bg-black/5 dark:bg-black/20">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-4 text-gray-500">Loading scene…</div>}>
            <NeuroScene />
          </Suspense>
        </ErrorBoundary>
      </main>

      <SidePanel />

      {/* Chat panel */}
      {showChat && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700">
          <ErrorBoundary>
            <Suspense fallback={<div className="p-4 text-gray-500">Loading AI assistant...</div>}>
              <ChatPanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      <StatusBar className="col-span-3">
        <div className="flex gap-2 ml-auto">
          {/* Help button */}
          <button
            onClick={() => setShowWelcome(true)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200
                       rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Help
          </button>

          {/* AI Assistant button */}
          <button
            onClick={toggleChat}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200
                     rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            {showChat ? 'Hide Assistant' : 'Show AI Assistant'}
          </button>
        </div>
      </StatusBar>

      {/* Welcome overlay for first-time users */}
      {showWelcome && <Welcome onClose={closeWelcome} />}

      <Suspense fallback={null}>
        <CheatSheet open={showCheats} onClose={closeCheats} />
      </Suspense>

      {process.env.NODE_ENV !== 'production' && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </div>
  )
}

export default React.memo(Viewer)