/**
 * Safe Local Persistence for AI Coach Chat History
 * Validates and sanitizes stored messages on load and bounds storage to the 20 most recent items.
 */

import type { ChatMessage } from '../types';
import { sanitizeTextInput } from './security';

const CHAT_STORAGE_KEY = 'aeroguard_chat_history_v1';
const MAX_SAVED_MESSAGES = 20;

export function loadSavedChatMessages(): ChatMessage[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (m): m is ChatMessage =>
          Boolean(m) &&
          typeof m === 'object' &&
          typeof (m as Record<string, unknown>).id === 'string' &&
          ((m as Record<string, unknown>).role === 'user' ||
            (m as Record<string, unknown>).role === 'assistant') &&
          typeof (m as Record<string, unknown>).content === 'string'
      )
      .slice(-MAX_SAVED_MESSAGES)
      .map((m) => ({
        id: sanitizeTextInput(m.id, 64) || `msg-${Date.now()}`,
        role: m.role,
        content: sanitizeTextInput(m.content, 4000),
        timestamp: typeof m.timestamp === 'string' ? sanitizeTextInput(m.timestamp, 24) : '',
        sourceMode: m.sourceMode === 'gemini-live' ? 'gemini-live' : 'expert-engine',
        modelUsed: typeof m.modelUsed === 'string' ? sanitizeTextInput(m.modelUsed, 64) : undefined,
        fallbackNotice:
          typeof m.fallbackNotice === 'string'
            ? sanitizeTextInput(m.fallbackNotice, 240)
            : undefined,
        keyMetricsCited: Array.isArray(m.keyMetricsCited)
          ? m.keyMetricsCited
              .filter((k): k is string => typeof k === 'string')
              .slice(0, 6)
              .map((k) => sanitizeTextInput(k, 120))
          : undefined,
      }));
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: ChatMessage[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    if (messages.length === 0) {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES))
      );
    }
  } catch {
    // Ignore private-mode or quota storage errors gracefully
  }
}
