import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
  } from 'react'
  import { useAppStore } from '@/store/useAppStore'
  import {
    ChevronRight,
    X,
    Layers,
    Info,
    Search as SearchIcon,
    RotateCcw,
    Maximize,
    Share2,
  } from 'lucide-react'
  import { brainModels, getModelById } from '@/utils/modelRegistry'
  import type { BrainModel } from '@/utils/modelRegistry'
  

  
  // Simple throttle implementation to avoid lodash dependency
  function throttle<T extends (...args: any[]) => void>(func: T, wait = 16): T & { cancel: () => void } {
    let lastTime = 0
    let timeout: ReturnType<typeof setTimeout> | null = null
  
    // Define the throttled function with explicit type annotation
    const throttled: ((...args: any[]) => void) & { cancel: () => void } = Object.assign(
      function (this: any, ...args: any[]) {
        const now = Date.now()
        const remaining = wait - (now - lastTime)
    
        if (remaining <= 0) {
          if (timeout) {
            clearTimeout(timeout)
            timeout = null
          }
          lastTime = now
          func.apply(this, args)
        } else if (!timeout) {
          timeout = setTimeout(() => {
            lastTime = Date.now()
            timeout = null
            func.apply(this, args)
          }, remaining)
        }
      },
      {
        cancel: () => {
          if (timeout) {
            clearTimeout(timeout)
            timeout = null
          }
        }
      }
    )
    
    return throttled as unknown as T & { cancel: () => void }
  }
  
  // Define available tabs
  type Tab = 'models' | 'info'
  
  // Header component
  const PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center bg-gray-100 dark:bg-gray-800">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
        <Layers size={18} className="mr-2 text-brain-blue" />
        Brain Models
      </h2>
      <button onClick={onClose} aria-label="Close panel" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">
        <X size={16} />
      </button>
    </div>
  )
  
  // Tabs component
  const PanelTabs: React.FC<{ activeTab: Tab; onTabChange: (tab: Tab) => void }> = ({ activeTab, onTabChange }) => (
    <div role="tablist" className="flex border-b border-gray-200 dark:border-gray-700">
      {(['models', 'info'] as Tab[]).map(tab => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === tab
              ? 'text-brain-blue border-b-2 border-brain-blue'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          {tab === 'models' ? <Layers size={16} className="inline mr-1" /> : <Info size={16} className="inline mr-1" />}
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  )
  
  // Models list tab
  const ModelsTab: React.FC<{
    models: BrainModel[]
    selectedId: string | null
    onSelect: (id: string) => void
    onRefresh: () => void
  }> = ({ models, selectedId, onSelect, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [debounced, setDebounced] = useState(searchTerm)
  
    // Debounce search input
    useEffect(() => {
      const id = setTimeout(() => setDebounced(searchTerm), 200)
      return () => clearTimeout(id)
    }, [searchTerm])
  
    // Filter models on debounced term
    const filtered = useMemo(
      () =>
        models.filter(
          m =>
            m.name.toLowerCase().includes(debounced.toLowerCase()) ||
            m.description.toLowerCase().includes(debounced.toLowerCase())
        ),
      [models, debounced]
    )
  
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Available Models</h3>
          <button onClick={onRefresh} title="Refresh models list" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">
            <RotateCcw size={14} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-700 py-2 pl-9 pr-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brain-blue"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map(m => (
            <button
              key={m.id}
              data-model-id={m.id}
              onClick={() => onSelect(m.id)}
              className={`p-3 rounded-lg border transition-all text-left flex flex-col ${
                selectedId === m.id
                  ? 'border-brain-blue bg-brain-blue/5 ring-1 ring-brain-blue/30'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="font-medium text-gray-900 dark:text-gray-100">{m.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.description}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No models found matching '{debounced}'
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Info tab panel
  const InfoTab: React.FC<{ model?: BrainModel; onFocus: () => void; onExport: () => void }> = ({ model, onFocus, onExport }) => {
    if (!model) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
          <Info size={40} className="mb-3 opacity-20" />
          <p>Select a brain region to view details</p>
        </div>
      )
    }
  
    return (
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{model.name}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{model.description}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">Interactions</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onFocus}
              className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-medium transition-colors"
            >
              <Maximize size={14} className="mr-1.5" />
              Focus
            </button>
            <button
              onClick={onExport}
              className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-medium transition-colors"
            >
              <Share2 size={14} className="mr-1.5" />
              Export View
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">Properties</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Position</span>
              <span className="font-mono text-xs">x: 0, y: 0, z: 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Volume</span>
              <span>1230 mm³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Triangles</span>
              <span>124,386</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Main side panel component
  const SidePanel: React.FC = () => {
    const open = useAppStore(state => state.sidePanelOpen)
    const togglePanel = useAppStore(state => state.togglePanel)
    const selectedId = useAppStore(state => state.selectedId)
    const setSelected = useAppStore(state => state.setSelected)
    const focusOnModel = useAppStore(state => state.focusOnModel)
    const currentModelRef = useAppStore(state => state.currentModelRef)
  
    const [activeTab, setActiveTab] = useState<Tab>('models')
    const [width, setWidth] = useState(350)
    const dragging = useRef<boolean>(false)
  
    // Start dragging
    const onMouseDown = useCallback(() => {
      dragging.current = true
    }, [])
  
    // Throttled mouse move handler
    const throttledMouseMove = useMemo(
      () =>
        throttle((e: MouseEvent) => {
          if (!dragging.current) return
          const newW = Math.min(Math.max(260, window.innerWidth - e.clientX), 600)
          setWidth(newW)
        }, 16),
      []
    )
  
    // Stop dragging
    const stopDrag = useCallback(() => {
      dragging.current = false
    }, [])
  
    useEffect(() => {
      window.addEventListener('mousemove', throttledMouseMove)
      window.addEventListener('mouseup', stopDrag)
      return () => {
        window.removeEventListener('mousemove', throttledMouseMove)
        window.removeEventListener('mouseup', stopDrag)
        // Since we've properly typed the throttled function, we can call cancel directly
        throttledMouseMove.cancel()
      }
    }, [throttledMouseMove, stopDrag])
  
    // Refresh models list
    const handleRefresh = useCallback(() => {
    setActiveTab('models')
    // First clear selection
    setSelected(null)
    
    // Then select the model after a brief delay
    // This ensures the previous model is fully unloaded
    setTimeout(() => {
      if (currentModelRef && currentModelRef.userData && currentModelRef.userData.id) {
          // Get the model ID from userData rather than trying to use the Group object directly
        const modelId = currentModelRef.userData.id;
        console.log('Refreshing model selection to:', modelId);
        setSelected(modelId);
      } else {
        // If no model is currently loaded, select the first available model
        const firstModel = brainModels[0]?.id;
        if (firstModel) {
          console.log('Auto-selecting first model:', firstModel);
          setSelected(firstModel);
        }
      }
    }, 300); // Increased timeout for better reliability
  }, [currentModelRef, setSelected, setActiveTab])
  
    // Select a model
    const handleSelect = useCallback((id: string) => {
    // Show visual feedback that we're loading the selected model
      const button = document.querySelector(`button[data-model-id="${id}"]`);
    if (button) {
      button.classList.add('animate-pulse');
      // Remove the animation after loading completes
      setTimeout(() => {
        button.classList.remove('animate-pulse');
      }, 2000);
    }
    
    console.log(`Selecting model with ID: ${id}`);
    setSelected(id);
  }, [setSelected])
  
    // Export current view
    const handleExport = useCallback(() => {
      const canvas = document.querySelector('canvas')
      if (canvas instanceof HTMLCanvasElement) {
        const link = document.createElement('a')
        link.download = `${selectedId as string}-view.png`
        link.href = canvas.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }, [selectedId])
  
    // Determine the current model based on a string ID
    const currentModel = useMemo<BrainModel | undefined>(() => {
      if (selectedId !== null && typeof selectedId === 'string') {
        return getModelById(selectedId)
      }
      return undefined
    }, [selectedId])
  
    return (
      <aside
        className={`relative h-full overflow-hidden bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-all duration-200 ease-in-out transform ${
          open ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'
        }`}
        style={{ width: `${width}px` }}
      >
        {!open && (
          <button
            onClick={togglePanel}
            aria-label="Open models panel"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 bg-brain-blue text-white p-2 rounded-r-md shadow-md z-50"
          >
            <ChevronRight size={20} />
          </button>
        )}
  
        {open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            onMouseDown={onMouseDown}
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-gray-300/50"
          />
        )}
  
        {open && <PanelHeader onClose={togglePanel} />}
        {open && <PanelTabs activeTab={activeTab} onTabChange={setActiveTab} />}
  
        {open && (
          <div className="h-[calc(100%-96px)] p-4 overflow-y-auto text-sm">
            {activeTab === 'models' ? (
              <ModelsTab
                models={brainModels}
                selectedId={typeof selectedId === 'string' ? selectedId : null}
                onSelect={handleSelect}
                onRefresh={handleRefresh}
              />
            ) : (
              <InfoTab model={currentModel} onFocus={() => focusOnModel()} onExport={handleExport} />
            )}
          </div>
        )}
      </aside>
    )
  }
  
  export default SidePanel
  