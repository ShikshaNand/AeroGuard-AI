import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiKeyDrawer } from '../components/ApiKeyDrawer';

describe('ApiKeyDrawer focus trap & validation UI', () => {
  it('renders Vercel environment connection badge, alerts on invalid key, and traps Tab focus', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onClose = vi.fn();

    render(
      <ApiKeyDrawer
        sessionApiKey=""
        isEnvOrProxyConnected={true}
        keyInputDraft=""
        keyError="API keys cannot contain spaces."
        onChangeDraft={vi.fn()}
        onSubmit={onSubmit}
        onClearKey={vi.fn()}
        onClose={onClose}
      />
    );

    expect(
      screen.getByText(/Live Gemini AI is connected automatically via deployment environment/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot contain spaces/i);

    // Input auto-focuses on mount; Shift+Tab loops focus to the Close button
    const input = screen.getByLabelText(/^Gemini API Key$/i);
    const closeBtn = screen.getByRole('button', { name: /Close AI settings panel/i });
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);

    // Tab from last element loops focus back to the input
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(input);

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
