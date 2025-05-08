// src/renderer/hooks/useKeyPress.ts
import { useEffect } from 'react';

/**
 * Custom hook to handle a specific key press.
 * @param targetKey The key to listen for (e.g., '?', 'Escape').
 * @param callback The function to call when the key is pressed.
 */
const useKeyPress = (targetKey: string, callback: () => void) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    // Cleanup function to remove the event listener when the component unmounts or dependencies change.
    return () => {
      window.removeEventListener('keydown', handler);
    };
    // Add callback to dependency array if its identity can change,
    // though for simple setShowCheats(v => !v) it's usually stable.
    // It's good practice to include all variables from the hook's scope that are used in the effect.
  }, [targetKey, callback]);
};

export default useKeyPress;