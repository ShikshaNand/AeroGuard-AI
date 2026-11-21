import { useEffect, useRef } from 'react';
import { savePersistedState, type PersistedAppState } from '../utils/storage';

const PERSIST_DEBOUNCE_MS = 150;

/**
 * Persists application state to localStorage with a short debounce so rapid
 * slider drags never block the main thread, while flushing immediately on
 * unmount or beforeunload so zero user edits are lost on refresh.
 */
export function useDebouncedPersistState(state: PersistedAppState): void {
  const latestRef = useRef(state);

  useEffect(() => {
    latestRef.current = state;
    const timer = setTimeout(() => {
      savePersistedState(latestRef.current);
    }, PERSIST_DEBOUNCE_MS);

    const flush = () => {
      clearTimeout(timer);
      savePersistedState(latestRef.current);
    };

    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      clearTimeout(timer);
      savePersistedState(latestRef.current);
    };
  }, [state]);
}
