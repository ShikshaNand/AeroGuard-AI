/**
 * Hardened Vercel Serverless Proxy for Google Gemini API
 * Security guarantees:
 * 1. Keeps GEMINI_API_KEY strictly server-side (never shipped in client JS bundles)
 * 2. Constructs the system instruction strictly server-side from validated domain context
 *    (prevents client-controlled system-prompt hijacking)
 * 3. Enforces same-origin checks, per-IP sliding-window rate limiting, prompt-injection
 *    validation, and safe JSON parsing (returns 400 instead of 500 on malformed JSON)
 */

import {
  buildGroundedSystemPrompt,
  callGeminiWithFallback,
  sanitizeGroundedPromptContext,
} from '../src/services/geminiProtocol';
import {
  SlidingWindowRateLimiter,
  validatePromptSafety,
} from '../src/utils/security';

export interface IncomingRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface OutgoingResponse {
  status(code: number): OutgoingResponse;
  setHeader(name: string, value: string): OutgoingResponse;
  json(payload: unknown): void;
}

const UPSTREAM_TIMEOUT_MS = 14_000;
const MAX_TRACKED_IPS = 250;
const ipRateLimiters = new Map<string, SlidingWindowRateLimiter>();

function getHeader(req: IncomingRequest, name: string): string {
  const val = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] ?? '';
  return typeof val === 'string' ? val : '';
}

function getClientIp(req: IncomingRequest): string {
  const forwarded = getHeader(req, 'x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim().slice(0, 64) || 'unknown';
  }
  return getHeader(req, 'x-real-ip').trim().slice(0, 64) || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  let limiter = ipRateLimiters.get(ip);
  if (!limiter) {
    if (ipRateLimiters.size >= MAX_TRACKED_IPS) {
      const oldestIp = ipRateLimiters.keys().next().value;
      if (oldestIp !== undefined) {
        ipRateLimiters.delete(oldestIp);
      }
    }
    limiter = new SlidingWindowRateLimiter(15, 60_000);
    ipRateLimiters.set(ip, limiter);
  }
  return limiter.tryAcquire();
}

/** Rejects cross-origin POST requests so third-party sites cannot drain API quota. */
function isSameOriginAllowed(req: IncomingRequest): boolean {
  const origin = getHeader(req, 'origin').trim();
  if (!origin) return true;
  const host = getHeader(req, 'host').trim();
  if (!host) return true;
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function getServerApiKey(): string {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return (proc?.env?.GEMINI_API_KEY || proc?.env?.VITE_GEMINI_API_KEY || '').trim();
}

function parseJsonBody(rawBody: unknown): Record<string, unknown> | null {
  if (rawBody === null || rawBody === undefined) return {};
  if (typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    return rawBody as Record<string, unknown>;
  }
  if (typeof rawBody === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Resets per-IP limiters (used in unit tests). */
export function resetServerRateLimiters(): void {
  ipRateLimiters.clear();
}

export default async function handler(req: IncomingRequest, res: OutgoingResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const apiKey = getServerApiKey();

  if (req.method === 'GET') {
    res.status(200).json({ configured: apiKey.length >= 16 });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isSameOriginAllowed(req)) {
    res.status(403).json({ error: 'Cross-origin requests are forbidden.' });
    return;
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute and retry.' });
    return;
  }

  if (apiKey.length < 16) {
    res.status(503).json({ configured: false, error: 'Server Gemini key is not configured.' });
    return;
  }

  const body = parseJsonBody(req.body);
  if (!body) {
    res.status(400).json({ error: 'Malformed JSON request body.' });
    return;
  }

  const promptValidation = validatePromptSafety(
    typeof body.prompt === 'string' ? body.prompt : '',
    600
  );
  if (!promptValidation.isValid) {
    res.status(400).json({ error: promptValidation.reason ?? 'Invalid prompt.' });
    return;
  }

  const safeContext = sanitizeGroundedPromptContext(body.context);
  if (!safeContext) {
    res.status(400).json({ error: 'Missing or invalid atmospheric context payload.' });
    return;
  }

  // System instruction is constructed STRICTLY server-side (never trusted from client)
  const systemInstruction = buildGroundedSystemPrompt(safeContext);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const outcome = await callGeminiWithFallback(
      apiKey,
      systemInstruction,
      promptValidation.sanitizedPrompt,
      controller.signal
    );

    if (outcome.ok && outcome.text) {
      res.status(200).json({ text: outcome.text, modelUsed: outcome.modelUsed });
      return;
    }

    res.status(outcome.status).json({ error: outcome.errorMessage ?? 'Gemini upstream error' });
  } catch {
    res.status(504).json({ error: 'Upstream Gemini request timed out.' });
  } finally {
    clearTimeout(timeoutId);
  }
}
