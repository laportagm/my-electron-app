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
    Folder,
    Map,
  } from 'lucide-react'
  import { brainModels, getModelById } from '@/utils/modelRegistry'
  import type { BrainModel } from '@/utils/modelRegistry'
  import AnnotationPanel from './annotations/AnnotationPanel'
  

  
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
  type Tab = 'models' | 'groups' | 'info' | 'annotations'
  
  // Model groups definitions - order is important for proper anatomical arrangement
  const MODEL_GROUPS = {
    'All Spinal Nerves': [
      // Order matters for anatomical alignment - load in sequence
      'SpinalNerves1',
      'SpinalNerves2',
      'SpinalNerves3',
      'SpinalNerves4',
      'SpinalNerves5',
      'SpinalNerves6',
    ],
    'Brainstem': [
      'BrainstemNerves',
      'BrainstenBasal',
      'midbrain',
      'pons',
      'rostral-medulla',
      'caudal-medulla'
    ],
    'Visual Pathway': [
      'Visual-Pathway',
      'Visual-Pathway-skull',
    ],
    'Basal Ganglia': [
      'StriatumBasal-Left',
      'StriatumBasal-Right',
      'Thalamus-Basal',
    ]
  };
  
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
      {(['models', 'groups', 'annotations', 'info'] as Tab[]).map(tab => (
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
          {tab === 'models' ? <Layers size={16} className="inline mr-1" /> :
           tab === 'groups' ? <Folder size={16} className="inline mr-1" /> :
           tab === 'annotations' ? <Map size={16} className="inline mr-1" /> :
           <Info size={16} className="inline mr-1" />}
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
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    // Define model categories
    const categories = useMemo(() => [
      { id: 'brain', name: 'Brain Structure', icon: '🧠' },
      { id: 'nerves', name: 'Nerves', icon: '⚡' },
      { id: 'brainstem', name: 'Brainstem', icon: '🔍' },
      { id: 'visual', name: 'Visual System', icon: '👁️' },
    ], []);

    // Assign models to categories (this could be coming from the model data)
    const modelCategories = useMemo(() => ({
      'brain': ['Brain1', 'Thalamus-Basal', 'StriatumBasal-Left', 'StriatumBasal-Right'],
      'nerves': ['SpinalNerves1', 'SpinalNerves2', 'SpinalNerves3', 'SpinalNerves4', 'SpinalNerves5', 'SpinalNerves6', 'CrainialNerves'],
      'brainstem': ['BrainstemNerves', 'BrainstenBasal', 'midbrain', 'pons', 'rostral-medulla', 'caudal-medulla'],
      'visual': ['Visual-Pathway', 'Visual-Pathway-skull', 'Tracts'],
    }), []);

    // Debounce search input
    useEffect(() => {
      const id = setTimeout(() => setDebounced(searchTerm), 200)
      return () => clearTimeout(id)
    }, [searchTerm])

    // Filter models on debounced term and category
    const filtered = useMemo(() => {
      // First filter by search term
      const searchFiltered = models.filter(
        m =>
          m.name.toLowerCase().includes(debounced.toLowerCase()) ||
          m.description.toLowerCase().includes(debounced.toLowerCase())
      );

      // Then filter by category if one is selected
      if (activeCategory && !debounced) {
        return searchFiltered.filter(m =>
          modelCategories[activeCategory as keyof typeof modelCategories]?.includes(m.id)
        );
      }

      return searchFiltered;
    }, [models, debounced, activeCategory, modelCategories]);

    // Function to handle category selection
    const handleCategoryClick = useCallback((categoryId: string) => {
      setActiveCategory(prev => prev === categoryId ? null : categoryId);
      setSearchTerm(''); // Clear search when selecting a category
    }, []);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Available Models</h3>
          <button
            onClick={onRefresh}
            title="Refresh models list"
            className="p-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                      transition-colors duration-200"
          >
            <RotateCcw size={14} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Categories horizontal scroll */}
        <div className="flex space-x-2 pb-2 overflow-x-auto scrollbar-thin">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`px-3 py-2 rounded-full whitespace-nowrap text-sm transition-all
                ${activeCategory === category.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-neumorph'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span className="mr-1.5">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-700 py-2 pl-9 pr-3 text-sm
                       bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500
                       placeholder-gray-500 dark:placeholder-gray-400 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
                        dark:hover:text-gray-300 p-1 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
          {filtered.length > 0 ? (
            filtered.map(m => (
              <button
                key={m.id}
                data-model-id={m.id}
                onClick={() => onSelect(m.id)}
                className={`p-4 rounded-xl backdrop-blur-md transition-all duration-300 text-left flex flex-col relative overflow-hidden card-hover
                  ${selectedId === m.id
                    ? 'bg-blue-500/10 dark:bg-blue-500/20 shadow-lg shadow-blue-500/10 border border-blue-500/30 dark:border-blue-400/30'
                    : 'bg-white/30 dark:bg-gray-800/30 border border-white/40 dark:border-gray-700/40 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:shadow-md'
                  }`}
              >
                {/* Background gradient decoration */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${
                  m.id.includes('Nerve')
                    ? 'from-blue-500/5 via-blue-500/10 to-purple-500/5'
                    : m.id.includes('stem')
                      ? 'from-green-500/5 via-green-500/10 to-teal-500/5'
                      : 'from-gray-500/5 via-gray-300/10 to-gray-500/5'
                } rounded-xl filter blur-xl opacity-70 -z-10 transition duration-500 group-hover:opacity-100`}></div>

                <div className="flex justify-between items-start">
                  <span className={`font-medium text-gray-900 dark:text-gray-100 ${
                    selectedId === m.id ? 'text-blue-700 dark:text-blue-300' : ''
                  }`}>{m.name}</span>

                  {/* Model type badge */}
                  {m.id.includes('Nerve') && (
                    <span className="badge-glass badge-blue">Nerve</span>
                  )}
                  {m.id.includes('stem') && (
                    <span className="badge-glass badge-green">Brainstem</span>
                  )}
                </div>

                <span className={`text-xs mt-1 line-clamp-2 ${
                  selectedId === m.id
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{m.description}</span>

                {/* Selection indicator */}
                {selectedId === m.id && (
                  <>
                    <div className="absolute bottom-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse-subtle"></div>
                    <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-500/10 rounded-tl-full"></div>
                  </>
                )}
              </button>
            ))
          ) : (
            <div className="py-8 text-center">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 inline-block mb-3">
                <SearchIcon size={24} className="text-gray-400 mx-auto" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No models found{debounced ? ` matching '${debounced}'` : ''}
              </p>
              {debounced && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Groups tab component
  const GroupsTab: React.FC<{
    onSelectGroup: (groupIds: string[]) => void
  }> = ({ onSelectGroup }) => {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Model Groups</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Click a group to load all models in that category
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(MODEL_GROUPS).map(([groupName, ids]) => (
            <button
              key={groupName}
              onClick={() => onSelectGroup(ids)}
              className="p-4 rounded-xl backdrop-blur-md border border-white/40 dark:border-gray-700/40
                bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-700/40
                hover:shadow-md text-left transition-all duration-300 relative overflow-hidden group"
            >
              {/* Background decoration */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5
                   rounded-xl filter blur-xl opacity-30 -z-10 transition duration-500 group-hover:opacity-70"></div>

              {/* Group icon based on name */}
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white mr-3 shadow-sm">
                  {groupName.includes('Spinal') && '🧠'}
                  {groupName.includes('Brainstem') && '🔬'}
                  {groupName.includes('Visual') && '👁️'}
                  {groupName.includes('Basal') && '⚡'}
                </div>
                <span className="font-medium text-brain-blue dark:text-blue-400">{groupName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {ids.length} models • Click to load all
                </span>
                <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center group-hover:translate-x-0.5 transition-transform">
                  Load
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };
  
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
  const SidePanel = () => {
    // Use individual selectors instead of object destructuring
    const open = useAppStore(state => state.sidePanelOpen)
    const selectedId = useAppStore(state => state.selectedId)
    const currentModelRef = useAppStore(state => state.currentModelRef)
    
    // Use callback wrappers for functions to prevent unnecessary renders
    const togglePanelFn = useAppStore(state => state.togglePanel)
    const togglePanel = useCallback(() => togglePanelFn(), [togglePanelFn])
    
    const setSelectedFn = useAppStore(state => state.setSelected)
    const setSelected = useCallback((id: string) => setSelectedFn(id), [setSelectedFn])
    
    const focusOnModelFn = useAppStore(state => state.focusOnModel)
    const focusOnModel = useCallback(() => focusOnModelFn(), [focusOnModelFn])

    const [activeTab, setActiveTab] = useState<Tab>('models')
    const [width, setWidth] = useState(350)
    const dragging = useRef<boolean>(false)
    const [isDragging, setIsDragging] = useState(false)

    // Function to handle loading a group of models
    const handleSelectGroup = useCallback((modelIds: string[]) => {
      if (modelIds.length > 0) {
        console.log(`Loading model group with ${modelIds.length} models`);
        // Use the new setMultipleSelected function to load all models at once
        const setMultipleSelected = useAppStore.getState().setMultipleSelected;
        setMultipleSelected(modelIds);

        // Provide visual feedback to the user
        const groupsTab = document.querySelector(`button[role="tab"][aria-selected="true"]`);
        if (groupsTab) {
          groupsTab.classList.add('bg-blue-100', 'dark:bg-blue-900', 'bg-opacity-50');
          setTimeout(() => {
            groupsTab.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'bg-opacity-50');
          }, 300);
        }

        // Keep the groups tab active to show what was selected
        // setActiveTab('models');
      }
    }, []);
  
    // Start dragging
    const onMouseDown = useCallback(() => {
      dragging.current = true
      setIsDragging(true)

      // Add a class to the body to change cursor during dragging
      document.body.classList.add('resizing')
    }, [])

    // Throttled mouse move handler
    const throttledMouseMove = useMemo(
      () =>
        throttle((e: MouseEvent) => {
          if (!dragging.current) return
          const newW = Math.min(Math.max(260, window.innerWidth - e.clientX), 600)
          setWidth(newW)

          // Add a visual feedback indicator of the resizing action
          const percentOfMax = ((newW - 260) / (600 - 260)) * 100
          const hue = Math.round(200 + (percentOfMax * 40 / 100)) // Hue range from 200 to 240 (blue range)
          document.documentElement.style.setProperty('--resize-indicator-color', `hsl(${hue}, 70%, 60%)`)
        }, 16),
      []
    )

    // Stop dragging
    const stopDrag = useCallback(() => {
      dragging.current = false
      setIsDragging(false)

      // Remove the resizing class from body
      document.body.classList.remove('resizing')

      // Optional: add a subtle animation to indicate the resize is complete
      const panel = document.querySelector('aside')
      if (panel) {
        panel.classList.add('resize-complete')
        setTimeout(() => {
          panel.classList.remove('resize-complete')
        }, 300)
      }
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
  }, [currentModelRef, setSelected])
  
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
        className={`relative h-full overflow-hidden bg-gray-50/90 dark:bg-gray-900/90 border-l backdrop-blur-sm border-gray-200/70 dark:border-gray-700/70 shadow-md z-10 transition-all duration-300 ease-in-out transform ${
          open ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'
        } ${isDragging ? 'border-l-blue-400 dark:border-l-blue-500 shadow-blue-500/20' : ''}`}
        style={{ width: `${width}px` }}
      >
        {/* Panel open/close button */}
        {!open && (
          <button
            onClick={togglePanel}
            aria-label="Open models panel"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 bg-gradient-to-r from-brain-blue to-brain-blue-dark text-white p-2 rounded-l-lg shadow-lg shadow-blue-500/20 z-50 hover:shadow-blue-500/30 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Resizer handle */}
        {open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            onMouseDown={onMouseDown}
            className="absolute left-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-blue-500/20 group"
          >
            {/* Visual indicator for resize handle */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-300/50 dark:bg-gray-600/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            {/* Drag indicator dots */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-24 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
              <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
              <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
              <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
              <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
            </div>
          </div>
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
            ) : activeTab === 'groups' ? (
              <GroupsTab onSelectGroup={handleSelectGroup} />
            ) : activeTab === 'annotations' ? (
              <AnnotationPanel modelId={selectedId || ''} />
            ) : (
              <InfoTab model={currentModel} onFocus={() => focusOnModel()} onExport={handleExport} />
            )}
          </div>
        )}
      </aside>
    )
  }
  
  export default React.memo(SidePanel)