import React, { useMemo, useCallback } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

// Use a standard function declaration instead of arrow function for better compatibility
export function ThemeToggle() {
  // Use separate selectors to prevent unnecessary re-renders
  const theme = useAppStore(state => state.theme)
  const toggleThemeAction = useAppStore(state => state.toggleTheme)

  // Memoize the toggle function to prevent unnecessary re-renders
  const toggleTheme = useCallback(() => {
    toggleThemeAction()
  }, [toggleThemeAction])

  // Memoize the button label
  const buttonLabel = useMemo(() =>
    `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,
    [theme]
  )

  // Memoize the icon based on theme
  const ThemeIcon = useMemo(() =>
    theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />,
    [theme]
  )

  return (
    <button
      onClick={toggleTheme}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
      aria-label={buttonLabel}
    >
      {ThemeIcon}
    </button>
  )
}

// Export as both named and default
export default React.memo(ThemeToggle)
