import React from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, Search, BrainCircuit, Book, Settings as SettingsIcon, Layers } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useAppStore } from '@/store/useAppStore'
import { useState } from 'react'
import { brainModels } from '@/utils/modelRegistry'

interface TopToolbarProps {
  className?: string;
}

const TopToolbar = ({ className = '' }: TopToolbarProps) => {
  const togglePanel = useAppStore((s) => s.togglePanel)
  const selectedModel = useAppStore((s) => s.selectedId)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // Handle search functionality
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Filter models based on search term
    const results = brainModels
      .filter(model => 
        model.name.toLowerCase().includes(term.toLowerCase()) ||
        model.description.toLowerCase().includes(term.toLowerCase())
      )
      .map(model => model.id);
    
    setSearchResults(results);
    setShowSearchResults(true);
  }

  return (
    <header className={`flex h-14 items-center justify-between bg-gray-50
                      dark:bg-gray-800 px-4 gap-4 shadow-sm z-10 ${className}`}>
      {/* left: branding and mode buttons */}
      <div className="flex items-center gap-4">
        <div className="flex items-center mr-2">
          <BrainCircuit size={24} className="text-brain-pink mr-2" />
          <span className="font-bold tracking-tight hidden sm:block">Neural Explorer</span>
        </div>
        
        <button
          type="button"
          onClick={togglePanel}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 bg-gray-100 dark:bg-gray-700"
          aria-label="Toggle models panel"
        >
          <Layers size={16} />
          <span className="text-sm font-medium">Models</span>
        </button>

        <nav className="flex items-center gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `font-medium px-3 py-1 rounded ${isActive ? 'bg-brain-blue/10 text-brain-blue' : 'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'}`
            }
          >
            Explore
          </NavLink>
          <NavLink
            to="/quiz"
            className={({ isActive }) =>
              `font-medium px-3 py-1 rounded ${isActive ? 'bg-brain-blue/10 text-brain-blue' : 'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'}`
            }
          >
            Quiz
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `font-medium px-3 py-1 rounded ${isActive ? 'bg-brain-blue/10 text-brain-blue' : 'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'}`
            }
          >
            <span className="hidden sm:inline">Settings</span>
            <SettingsIcon size={16} className="sm:hidden" />
          </NavLink>
        </nav>
      </div>

      {/* middle: currently selected model name */}
      <div className="hidden md:block font-medium text-gray-700 dark:text-gray-300">
        {selectedModel ? `Viewing: ${selectedModel}` : 'No model selected'}
      </div>

      {/* right: search & utilities */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Search structures..."
            className="w-full rounded-full border border-gray-300 dark:border-gray-600 pl-8 pr-3
                      h-8 text-sm bg-white dark:bg-gray-700 transition-all
                      focus:outline-none focus:ring-2 focus:ring-brain-blue/50 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <ThemeToggle />
      </div>

      {/* Search results dropdown */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="absolute top-14 right-16 w-64 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
          <div className="p-2">
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Search Results</h3>
            <ul>
              {searchResults.map((id) => {
                const model = brainModels.find(m => m.id === id);
                if (!model) return null;
                
                return (
                  <li key={id} className="mb-1">
                    <button
                      onClick={() => {
                        useAppStore.getState().setSelected(id);
                        setShowSearchResults(false);
                        setSearchTerm('');
                      }}
                      className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                    >
                      {model.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </header>
  )
}

export default TopToolbar
