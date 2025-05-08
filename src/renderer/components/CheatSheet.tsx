import React from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import {
  X,
  Keyboard,
  Mouse,
  RotateCcw,
  ZoomIn,
  Move,
  Home,
  Info,
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

interface Row {
  icon: React.ReactElement
  label: string
  action: string | React.ReactElement
}

const mouseRows: Row[] = [
  {
    icon: <RotateCcw size={16} />,
    label: 'Orbit Camera',
    action: 'Left Mouse + Drag',
  },
  {
    icon: <ZoomIn size={16} />,
    label: 'Zoom In/Out',
    action: 'Mouse Wheel',
  },
  {
    icon: <Move size={16} />,
    label: 'Pan View',
    action: 'Right Mouse + Drag',
  },
]

const keyRows: Row[] = [
  { icon: <Home size={16} />, label: 'Reset View', action: <kbd>R</kbd> },
  { icon: <span className="font-mono text-xs">F</span>, label: 'Focus on Selection', action: <kbd>F</kbd> },
  { icon: <span className="font-mono text-xs">H</span>, label: 'Hide/Show Selection', action: <kbd>H</kbd> },
  { icon: <Info size={16} />, label: 'Toggle Help', action: <kbd>?</kbd> },
]

const CheatSheet = ({ open, onClose }: Props) => {
  const firstEl = useRef<HTMLButtonElement>(null)

  // close on ESC
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handle)
    firstEl.current?.focus()
    // lock body scroll
    const { style } = document.body
    const prev = style.overflow
    style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handle)
      style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const renderRows = (rows: Row[]) =>
    rows.map(({ icon, label, action }) => (
      <li
        key={label}
        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center">
          <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg mr-3 text-gray-500">
            {icon}
          </span>
          <span>{label}</span>
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-sm">{action}</span>
      </li>
    ))

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheatsheet-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-[32rem] max-w-[90vw] max-h-[80vh] overflow-y-auto relative border border-gray-200 dark:border-gray-700 outline-none">
        <button
          ref={firstEl}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-brain-blue"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <header className="flex items-center mb-4 text-brain-blue">
          <Keyboard size={20} className="mr-2" />
          <h2 id="cheatsheet-title" className="text-xl font-semibold">
            Keyboard Shortcuts
          </h2>
        </header>

        <section className="space-y-6 text-sm">
          <div>
            <h3 className="flex items-center mb-3 font-medium">
              <Mouse size={16} className="mr-2 text-gray-500" /> Mouse Controls
            </h3>
            <ul className="space-y-2">{renderRows(mouseRows)}</ul>
          </div>

          <div>
            <h3 className="flex items-center mb-3 font-medium">
              <Keyboard size={16} className="mr-2 text-gray-500" /> Keyboard Controls
            </h3>
            <ul className="space-y-2">{renderRows(keyRows)}</ul>
          </div>
        </section>

        <footer className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Tip: press&nbsp;
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">
            Tab
          </kbd>
          &nbsp;to cycle through UI elements
        </footer>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

export default CheatSheet
