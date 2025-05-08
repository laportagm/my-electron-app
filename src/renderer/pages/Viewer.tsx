import React, { useState, useEffect, useCallback, Suspense, Component, ReactNode } from 'react'
import TopToolbar from '@/components/TopToolbar'
import SidePanel from '@/components/SidePanel'
import StatusBar from '@/components/StatusBar'
import NeuroScene from '@/components/NeuroScene'

// Lazy-load heavy panels
const CheatSheet = React.lazy(() => import('@/components/CheatSheet'))
const DebugPanel = React.lazy(() => import('@/components/DebugPanel'))

// ErrorBoundary catches render errors
type ErrorBoundaryProps = { children: ReactNode }

type ErrorBoundaryState = { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Initialize state with both fields to match ErrorBoundaryState
  state: ErrorBoundaryState = { hasError: false, error: undefined }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error in NeuroScene:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 text-red-600 bg-red-100">
          <p>Error loading scene:</p>
          <pre className="whitespace-pre-wrap">{this.state.error?.message}</pre>
          <button onClick={this.handleReset} className="mt-2 px-3 py-1 border">
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

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

const Viewer: React.FC = () => {
  const [showCheats, closeCheats] = useHelpToggle()

  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto] grid-cols-[1fr_auto] overflow-hidden">
      <TopToolbar className="col-span-2" />

      <main className="bg-black/5 dark:bg-black/20">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-4 text-gray-500">Loading scene…</div>}>
            <NeuroScene />
          </Suspense>
        </ErrorBoundary>
      </main>

      <SidePanel />
      <StatusBar className="col-span-2" />

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
