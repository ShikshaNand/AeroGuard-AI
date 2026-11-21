import React from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { maskApiKey } from '../utils/security';

interface ApiKeyDrawerProps {
  sessionApiKey: string;
  keyInputDraft: string;
  keyError: string | null;
  onChangeDraft: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearKey: () => void;
  onClose: () => void;
}

/**
 * Optional In-Memory Gemini API Key Configuration Drawer
 * Keys are validated before saving and kept strictly in volatile RAM.
 */
export const ApiKeyDrawer: React.FC<ApiKeyDrawerProps> = React.memo(
  ({
    sessionApiKey,
    keyInputDraft,
    keyError,
    onChangeDraft,
    onSubmit,
    onClearKey,
    onClose,
  }) => (
    <form
      onSubmit={onSubmit}
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
            The assistant already works right away using our built-in science engine. If you have a Gemini API key, paste it here (kept only in memory for this session).
          </p>
          {sessionApiKey && (
            <p className="text-brand-ink font-semibold">
              Active session key: <code>{maskApiKey(sessionApiKey)}</code>
            </p>
          )}
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
  )
);
ApiKeyDrawer.displayName = 'ApiKeyDrawer';
