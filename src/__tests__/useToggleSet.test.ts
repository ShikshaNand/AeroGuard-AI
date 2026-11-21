import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToggleSet } from '../hooks/useToggleSet';

describe('useToggleSet hook', () => {
  it('toggles membership immutably and replaces all items cleanly', () => {
    const { result } = renderHook(() => useToggleSet(['a', 'b']));

    expect(Array.from(result.current[0])).toEqual(['a', 'b']);

    act(() => {
      result.current[1]('b');
    });
    expect(result.current[0].has('b')).toBe(false);
    expect(result.current[0].has('a')).toBe(true);

    act(() => {
      result.current[1]('c');
    });
    expect(result.current[0].has('c')).toBe(true);

    act(() => {
      result.current[2](['x', 'y']);
    });
    expect(Array.from(result.current[0])).toEqual(['x', 'y']);
  });
});
