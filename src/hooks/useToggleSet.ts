import { useCallback, useState } from 'react';

/**
 * Immutable Set state hook with stable toggle / replace callbacks.
 * Replaces three hand-written copies of the same toggle logic in App.
 */
export function useToggleSet(initial: Iterable<string>) {
  const [values, setValues] = useState<Set<string>>(() => new Set(initial));

  const toggle = useCallback((id: string) => {
    setValues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const replaceAll = useCallback((ids: Iterable<string>) => {
    setValues(new Set(ids));
  }, []);

  return [values, toggle, replaceAll] as const;
}
