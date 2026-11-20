import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { STORAGE_KEY } from '../utils/storage';

let shouldThrow = true;

function FaultyChild() {
  if (shouldThrow) {
    throw new Error('<script>bad()</script>Simulated render crash');
  }
  return <div>Recovered UI</div>;
}

describe('ErrorBoundary fault tolerance & recovery', () => {
  afterEach(() => {
    shouldThrow = true;
    vi.restoreAllMocks();
  });

  it('catches render errors, sanitizes the message, and recovers after clearing persisted state', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(STORAGE_KEY, '{"broken":true}');

    render(
      <ErrorBoundary>
        <FaultyChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Simulated render crash/i)).toBeInTheDocument();
    expect(screen.queryByText(/<script>/i)).not.toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /Reset & Recover Application/i }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText('Recovered UI')).toBeInTheDocument();
  });
});
