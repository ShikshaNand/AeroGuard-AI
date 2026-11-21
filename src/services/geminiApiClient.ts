/**
 * Google Gemini API & Same-Origin Serverless Proxy Client
 * Supports:
 * 1. Same-origin `/api/gemini` Vercel Serverless Proxy (zero client-side API key exposure)
 * 2. Direct browser Gemini calls via optional RAM-only session key or build-time VITE_GEMINI_API_KEY
 * Includes automatic HTTP 404 model discovery via `v1beta/models` and 14-second abort timeouts.
 */

import { sanitizeTextInput } from '../utils/security';

export const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
] as const;

interface GeminiListModelItem {
  name?: string;
  supportedGenerationMethods?: string[];
}

export interface LiveGeminiCallResult {
  ok: boolean;
  text?: string;
  modelUsed?: string;
  fallbackNotice?: string;
}

let cachedWorkingModel: string | null = null;
let cachedKeySig = '';
let cachedServerProxyStatus: boolean | null = null;

/** Returns the build-time Vite Gemini key if configured, or empty string. */
export function getClientEnvGeminiKey(): string {
  return (import.meta.env?.VITE_GEMINI_API_KEY ?? '').trim();
}

/** Returns true when either a session key or build-time env key is present. */
export function hasClientGeminiKey(sessionApiKey?: string): boolean {
  const effective = (sessionApiKey?.trim() || getClientEnvGeminiKey());
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

/** Resets cached proxy probe status (used by tests). */
export function resetGeminiClientCaches(): void {
  cachedWorkingModel = null;
  cachedKeySig = '';
  cachedServerProxyStatus = null;
}

/** Calls the same-origin `/api/gemini` proxy when deployed on Vercel. */
export async function invokeServerGeminiProxy(
  systemInstruction: string,
  prompt: string,
  signal: AbortSignal
): Promise<{ ok: boolean; status: number; text?: string; modelUsed?: string; errorMessage?: string }> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ systemInstruction, prompt }),
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

async function discoverAvailableGeminiModels(
  apiKey: string,
  signal: AbortSignal
): Promise<string[]> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
      signal,
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { models?: GeminiListModelItem[] };
    const models = Array.isArray(data.models) ? data.models : [];

    return models
      .filter(
        (m): m is GeminiListModelItem & { name: string } =>
          typeof m.name === 'string' &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          m.name.toLowerCase().includes('gemini') &&
          !m.name.toLowerCase().includes('embedding') &&
          !m.name.toLowerCase().includes('vision-only') &&
          !m.name.toLowerCase().includes('tts') &&
          !m.name.toLowerCase().includes('image')
      )
      .map((m) => m.name.replace(/^models\//, ''))
      .sort((a, b) => {
        const rank = (id: string) => {
          const low = id.toLowerCase();
          if (low.includes('2.5-flash') && !low.includes('lite')) return 1;
          if (low.includes('2.0-flash') && !low.includes('lite')) return 2;
          if (low.includes('flash')) return 3;
          if (low.includes('pro')) return 4;
          return 5;
        };
        return rank(a) - rank(b);
      });
  } catch {
    return [];
  }
}

async function invokeDirectGeminiModel(
  apiKey: string,
  modelId: string,
  systemInstruction: string,
  prompt: string,
  signal: AbortSignal
): Promise<{ ok: boolean; status: number; text?: string; errorMessage?: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelId
    )}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 750 },
      }),
    }
  );

  if (res.ok) {
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return {
      ok: true,
      status: res.status,
      text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim(),
    };
  }

  let errorMessage: string | undefined;
  try {
    const errJson = (await res.json()) as { error?: { message?: string } };
    errorMessage = errJson.error?.message;
  } catch {
    // ignore non-JSON upstream error body
  }
  return { ok: false, status: res.status, errorMessage };
}

/**
 * Executes a live Gemini request via direct client key (if provided) or via
 * the same-origin `/api/gemini` Vercel proxy when no client key is set.
 */
export async function executeLiveGeminiRequest(
  systemInstruction: string,
  prompt: string,
  sessionApiKey?: string
): Promise<LiveGeminiCallResult> {
  const directKey = (sessionApiKey?.trim() || getClientEnvGeminiKey());
  const useServerProxy = directKey.length < 16 && cachedServerProxyStatus === true;

  if (directKey.length < 16 && !useServerProxy) {
    return { ok: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14_000);

  try {
    if (useServerProxy) {
      const proxyRes = await invokeServerGeminiProxy(systemInstruction, prompt, controller.signal);
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

    const candidates: string[] = cachedWorkingModel
      ? [cachedWorkingModel, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== cachedWorkingModel)]
      : [...DEFAULT_GEMINI_MODELS];

    let lastStatus = 0;
    let lastErrorMsg = '';
    let discovered = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const modelId = candidates[i];
      const attempt = await invokeDirectGeminiModel(
        directKey,
        modelId,
        systemInstruction,
        prompt,
        controller.signal
      );

      if (attempt.ok && attempt.text && attempt.text.length > 15) {
        cachedWorkingModel = modelId;
        return { ok: true, text: attempt.text, modelUsed: modelId };
      }

      lastStatus = attempt.status;
      lastErrorMsg = attempt.errorMessage || '';

      if (
        attempt.status === 401 ||
        attempt.status === 403 ||
        (attempt.status === 400 && lastErrorMsg.toLowerCase().includes('api key'))
      ) {
        break;
      }

      if (attempt.status === 404 && !discovered) {
        discovered = true;
        const liveModels = await discoverAvailableGeminiModels(directKey, controller.signal);
        for (const discoveredModel of liveModels) {
          if (!candidates.includes(discoveredModel)) {
            candidates.push(discoveredModel);
          }
        }
      }
    }

    const safeDetail = lastErrorMsg ? ` (${sanitizeTextInput(lastErrorMsg, 90)})` : '';
    return {
      ok: false,
      fallbackNotice: `Live Gemini API returned HTTP ${lastStatus || 'error'}${safeDetail} — answered instantly using our built-in science engine.`,
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
