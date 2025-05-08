import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Compass, Cpu } from 'lucide-react'

interface Props {
  className?: string;
}

/** Fixed bottom bar for coordinates & status */
const StatusBar = ({ className = '' }: Props) => {
  const isLoading = useAppStore((s) => s.isLoading)
  const selectedId = useAppStore((s) => s.selectedId)
  
  return (
    <footer className={`h-8 bg-gray-50 dark:bg-gray-800 text-xs
                       flex items-center justify-between px-4
                       border-t border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center gap-4">
        <span className="flex items-center text-gray-600 dark:text-gray-400">
          <Compass size={12} className="mr-1.5" />
          <span className="font-mono">XYZ: 0, 0, 0</span>
        </span>
        
        <span className="flex items-center text-gray-600 dark:text-gray-400">
          <Cpu size={12} className="mr-1.5" />
          {isLoading ? (
            <span className="text-amber-500 font-medium flex items-center">
              <span className="animate-pulse mr-1.5">⬤</span>
              Loading...
            </span>
          ) : (
            <span>Idle {selectedId ? `| ${selectedId}` : ''}</span>
          )}
        </span>
      </div>
      
      <div className="text-gray-500 dark:text-gray-400">
        <span className="text-xs">Version 0.1</span>
      </div>
    </footer>
  )
}

export default StatusBar