/**
 * Browser Gemini Client & Same-Origin Vercel Proxy Connector
 * Routes live requests securely through `/api/gemini` (sending structured context,
 * never client-controlled system prompts) when available on Vercel, or uses an
 * optional RAM-only session key / local dev key via the shared `geminiProtocol`.
 */

import { sanitizeTextInput } from '../utils/security';
import {
  buildGroundedSystemPrompt,
  callGeminiWithFallback,
  type GroundedPromptContext,
} from './geminiProtocol';

export interface LiveGeminiCallResult {
  ok: boolean;
  text?: string;
  modelUsed?: string;
  fallbackNotice?: string;
}

let cachedWorkingModel: string | null = null;
let cachedKeySig = '';
let cachedServerProxyStatus: boolean | null = null;

/** Returns the build-time Vite Gemini key if configured for local dev, or empty string. */
export function getClientEnvGeminiKey(): string {
  return (import.meta.env?.VITE_GEMINI_API_KEY ?? '').trim();
}

/** Returns true when either a session key or local env key is present. */
export function hasClientGeminiKey(sessionApiKey?: string): boolean {
  const effective = sessionApiKey?.trim() || getClientEnvGeminiKey();
  return effective.length >= 16;
}

/**
 * Probes the same-origin `/api/gemini` Vercel Serverless Proxy once per session
 * to determine whether a server-side GEMINI_API_KEY is configured.
 */
export async function checkServerGeminiProxy(): Promise<boolean> {
  if (cachedServerProxyStatus !== null) {
    return cachedServerProxyStatus;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch('/api/gemini', { method: 'GET', signal: controller.signal });
    if (!res.ok) {
      cachedServerProxyStatus = false;
      return false;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      cachedServerProxyStatus = false;
      return false;
    }
    const data = (await res.json()) as { configured?: boolean };
    cachedServerProxyStatus = Boolean(data.configured);
    return cachedServerProxyStatus;
  } catch {
    cachedServerProxyStatus = false;
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Resets cached proxy probe & model state (used by unit tests). */
export function resetGeminiClientCaches(): void {
  cachedWorkingModel = null;
  cachedKeySig = '';
  cachedServerProxyStatus = null;
}

async function invokeServerGeminiProxy(
  prompt: string,
  context: GroundedPromptContext,
  signal: AbortSignal
): Promise<{ ok: boolean; status: number; text?: string; modelUsed?: string; errorMessage?: string }> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AeroGuard-Client': 'web-v1',
    },
    signal,
    body: JSON.stringify({ prompt, context }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { ok: false, status: res.status };
  }

  const data = (await res.json()) as { text?: string; modelUsed?: string; error?: string };
  if (res.ok && data.text) {
    return { ok: true, status: res.status, text: data.text.trim(), modelUsed: data.modelUsed };
  }
  return { ok: false, status: res.status, errorMessage: data.error };
}

/**
 * Executes a live Gemini request:
 * - Prefers user's explicit session key if manually entered in AI Settings
 * - Otherwise prefers same-origin `/api/gemini` Vercel proxy (zero client key exposure)
 * - Falls back to local build-time `VITE_GEMINI_API_KEY` if set in local dev
 */
export async function executeLiveGeminiRequest(
  prompt: string,
  context: GroundedPromptContext,
  sessionApiKey?: string
): Promise<LiveGeminiCallResult> {
  const explicitSessionKey = (sessionApiKey ?? '').trim();
  const useServerProxy = explicitSessionKey.length < 16 && cachedServerProxyStatus === true;
  const directKey = explicitSessionKey || getClientEnvGeminiKey();

  if (!useServerProxy && directKey.length < 16) {
    return { ok: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14_000);

  try {
    if (useServerProxy) {
      const proxyRes = await invokeServerGeminiProxy(prompt, context, controller.signal);
      if (proxyRes.ok && proxyRes.text && proxyRes.text.length > 15) {
        return { ok: true, text: proxyRes.text, modelUsed: proxyRes.modelUsed ?? 'gemini-proxy' };
      }
      const safeErr = proxyRes.errorMessage
        ? ` (${sanitizeTextInput(proxyRes.errorMessage, 90)})`
        : '';
      return {
        ok: false,
        fallbackNotice: `Live Gemini proxy returned HTTP ${proxyRes.status || 'error'}${safeErr} — answered instantly using our built-in science engine.`,
      };
    }

    const keySig = directKey.slice(-6);
    if (keySig !== cachedKeySig) {
      cachedWorkingModel = null;
      cachedKeySig = keySig;
    }

    const systemInstruction = buildGroundedSystemPrompt(context);
    const outcome = await callGeminiWithFallback(
      directKey,
      systemInstruction,
      prompt,
      controller.signal,
      cachedWorkingModel
    );

    if (outcome.ok && outcome.text && outcome.modelUsed) {
      cachedWorkingModel = outcome.modelUsed;
      return { ok: true, text: outcome.text, modelUsed: outcome.modelUsed };
    }

    const safeDetail = outcome.errorMessage ? ` (${outcome.errorMessage.slice(0, 90)})` : '';
    return {
      ok: false,
      fallbackNotice: `Live Gemini API returned HTTP ${outcome.status || 'error'}${safeDetail} — answered instantly using our built-in science engine.`,
    };
  } catch {
    return {
      ok: false,
      fallbackNotice:
        'Could not reach live Gemini API (offline or timeout) — answered instantly using our built-in science engine.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
