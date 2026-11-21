import React, { useEffect, useRef } from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { maskApiKey } from '../utils/security';

interface ApiKeyDrawerProps {
  sessionApiKey: string;
  isEnvOrProxyConnected: boolean;
  keyInputDraft: string;
  keyError: string | null;
  onChangeDraft: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearKey: () => void;
  onClose: () => void;
}

/**
 * Optional In-Memory Gemini API Key Configuration Drawer
 * Implements keyboard focus trapping (Tab / Shift+Tab loop) and displays live
 * Vercel environment / serverless proxy status alongside optional session keys.
 */
export const ApiKeyDrawer: React.FC<ApiKeyDrawerProps> = React.memo(
  ({
    sessionApiKey,
    isEnvOrProxyConnected,
    keyInputDraft,
    keyError,
    onChangeDraft,
    onSubmit,
    onClearKey,
    onClose,
  }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    const handleTrapKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key !== 'Tab' || !formRef.current) return;
      const focusable = formRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    return (
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onKeyDown={handleTrapKeyDown}
        role="dialog"
        aria-modal="false"
        aria-label="Configure optional Gemini API key"
        className="beige-sage animate-drawer-enter mt-3 rounded-xl p-3.5 text-xs"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-bold text-brand-ink flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Optional: Connect Live Google Gemini AI
            </p>
            <p className="text-ink-secondary">
              The assistant works immediately using our built-in science engine. Paste a personal Gemini API key below (RAM-only for this session) or configure <code>GEMINI_API_KEY</code> / <code>VITE_GEMINI_API_KEY</code> on Vercel.
            </p>
            {sessionApiKey ? (
              <p className="text-brand-ink font-semibold">
                Active session key: <code>{maskApiKey(sessionApiKey)}</code>
              </p>
            ) : isEnvOrProxyConnected ? (
              <p className="text-brand-ink font-semibold">
                ✓ Live Gemini AI is connected automatically via deployment environment.
              </p>
            ) : null}
            {keyError && (
              <p role="alert" className="font-semibold text-danger-ink">
                {keyError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="gemini-key-input" className="sr-only">
              Gemini API Key
            </label>
            <input
              ref={inputRef}
              id="gemini-key-input"
              type="password"
              autoComplete="off"
              value={keyInputDraft}
              onChange={(e) => onChangeDraft(e.target.value)}
              placeholder="Paste Gemini API key..."
              className="rounded-lg border border-sage-line bg-surface px-3 py-1.5 text-xs text-ink"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 font-semibold text-on-brand hover:bg-brand-hover"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Save
            </button>
            {sessionApiKey && (
              <button
                type="button"
                onClick={onClearKey}
                className="rounded-lg border border-danger-line bg-terracotta-soft px-2.5 py-1.5 text-danger-ink font-semibold hover:bg-terracotta-soft"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI settings panel"
              className="rounded-lg p-1.5 text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    );
  }
);
ApiKeyDrawer.displayName = 'ApiKeyDrawer';
