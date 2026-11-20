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
          <p className="font-bold text-[#1B4D35] flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Optional: Connect Live Google Gemini AI
          </p>
          <p className="text-[#3A4A40]">
            The assistant already works right away using our built-in science engine. If you have a Gemini API key, paste it here (kept only in memory for this session).
          </p>
          {sessionApiKey && (
            <p className="text-[#1B4D35] font-semibold">
              Active session key: <code>{maskApiKey(sessionApiKey)}</code>
            </p>
          )}
          {keyError && (
            <p role="alert" className="font-semibold text-[#8F1D1D]">
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
            className="rounded-lg border border-[#BDD8C5] bg-[#FFFDF8] px-3 py-1.5 text-xs text-[#2B241D]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-[#2D6A4F] px-3 py-1.5 font-semibold text-[#FFFDF8] hover:bg-[#1B4D35]"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Save
          </button>
          {sessionApiKey && (
            <button
              type="button"
              onClick={onClearKey}
              className="rounded-lg border border-[#D89A8E] bg-[#FDF1EC] px-2.5 py-1.5 text-[#8F1D1D] font-semibold hover:bg-[#F9DFD7]"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI settings panel"
            className="rounded-lg p-1.5 text-[#5C5246] hover:text-[#231D17]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  )
);
ApiKeyDrawer.displayName = 'ApiKeyDrawer';
