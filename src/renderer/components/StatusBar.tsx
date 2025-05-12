import React, { useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Compass, Cpu, ChevronUp, Info, Activity, Database, HardDrive } from 'lucide-react'

interface Props {
  className?: string;
  children?: React.ReactNode;
}

/** Enhanced status bar with system metrics and expandable details */
const StatusBar = ({ className = '', children }: Props) => {
  const [showDetails, setShowDetails] = useState(false);
  const isLoading = useAppStore((s) => s.isLoading);
  const selectedId = useAppStore((s) => s.selectedId);

  // Toggle details panel
  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  return (
    <>
      {/* Expandable details panel */}
      {showDetails && (
        <div className="fixed bottom-8 left-0 right-0 bg-glass shadow-lg z-10 transform animate-fade-in-up p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Info size={14} className="mr-1.5" />
                Model Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Model ID:</div>
                <div className="font-mono">{selectedId || 'None'}</div>
                <div>Type:</div>
                <div className="font-mono">3D Brain Model</div>
                <div>Loaded:</div>
                <div className="font-mono">{isLoading ? 'Loading...' : 'Complete'}</div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Activity size={14} className="mr-1.5" />
                Rendering Metrics
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>FPS:</div>
                <div className="font-mono">60</div>
                <div>Draw calls:</div>
                <div className="font-mono">127</div>
                <div>Triangles:</div>
                <div className="font-mono">156,432</div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Database size={14} className="mr-1.5" />
                System Resources
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Memory usage:</div>
                <div className="font-mono">284.2 MB</div>
                <div>GPU memory:</div>
                <div className="font-mono">123.8 MB</div>
                <div>Status:</div>
                <div className="font-mono">
                  <span className="badge badge-green">Optimal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main status bar */}
      <footer className={`h-8 bg-gray-50 dark:bg-gray-800 text-xs
                        flex items-center justify-between px-4 relative z-20
                        border-t border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDetails}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label={showDetails ? "Hide system details" : "Show system details"}
          >
            <ChevronUp size={12} className={`mr-1 transition-transform duration-200 ${showDetails ? '' : 'rotate-180'}`} />
            <HardDrive size={12} className="mr-1.5" />
            <span className="hide-on-mobile">System</span>
          </button>

          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <Compass size={12} className="mr-1.5" />
            <span className="font-mono">XYZ: 0, 0, 0</span>
          </span>

          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <Cpu size={12} className="mr-1.5" />
            {isLoading ? (
              <span className="text-amber-500 font-medium flex items-center">
                <span className="animate-pulse-subtle mr-1.5">⬤</span>
                Loading...
              </span>
            ) : (
              <span>
                Idle
                {selectedId && (
                  <>
                    <span className="mx-1.5 text-gray-400">|</span>
                    <span className="badge badge-blue ml-1">{selectedId}</span>
                  </>
                )}
              </span>
            )}
          </span>
        </div>

        {/* Custom actions from children */}
        {children}

        <div className="text-gray-500 dark:text-gray-400 flex items-center">
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">v0.1</span>
        </div>
      </footer>
    </>
  )
}

export default StatusBar