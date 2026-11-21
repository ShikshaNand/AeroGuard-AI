/**
 * Vercel Serverless Proxy for Google Gemini API
 * Keeps GEMINI_API_KEY (or VITE_GEMINI_API_KEY) strictly server-side at runtime
 * so production deployments never expose API secrets in browser bundles or headers.
 */

interface IncomingRequest {
  method?: string;
  body?: unknown;
}

interface OutgoingResponse {
  status(code: number): OutgoingResponse;
  setHeader(name: string, value: string): OutgoingResponse;
  json(payload: unknown): void;
}

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

const UPSTREAM_TIMEOUT_MS = 14_000;

interface ListModelItem {
  name?: string;
  supportedGenerationMethods?: string[];
}

function getServerApiKey(): string {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return (proc?.env?.GEMINI_API_KEY || proc?.env?.VITE_GEMINI_API_KEY || '').trim();
}

async function discoverModels(apiKey: string, signal: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: ListModelItem[] };
    const models = Array.isArray(data.models) ? data.models : [];
    return models
      .filter(
        (m) =>
          typeof m.name === 'string' &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          m.name.toLowerCase().includes('gemini') &&
          !m.name.toLowerCase().includes('embedding') &&
          !m.name.toLowerCase().includes('tts') &&
          !m.name.toLowerCase().includes('image')
      )
      .map((m) => (m.name as string).replace(/^models\//, ''));
  } catch {
    return [];
  }
}

async function generateWithModel(
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
    const err = (await res.json()) as { error?: { message?: string } };
    errorMessage = err.error?.message;
  } catch {
    // non-JSON upstream error
  }
  return { ok: false, status: res.status, errorMessage };
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

  if (apiKey.length < 16) {
    res.status(503).json({ configured: false, error: 'Server Gemini key is not configured.' });
    return;
  }

  const body =
    typeof req.body === 'string'
      ? (JSON.parse(req.body) as Record<string, unknown>)
      : ((req.body ?? {}) as Record<string, unknown>);

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 600) : '';
  const systemInstruction =
    typeof body.systemInstruction === 'string' ? body.systemInstruction.trim().slice(0, 3000) : '';

  if (prompt.length < 2 || systemInstruction.length < 10) {
    res.status(400).json({ error: 'Invalid prompt or systemInstruction payload.' });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const candidates = [...DEFAULT_MODELS];
    let discovered = false;
    let lastStatus = 502;
    let lastError = 'Gemini upstream error';

    for (let i = 0; i < candidates.length; i += 1) {
      const modelId = candidates[i];
      const attempt = await generateWithModel(
        apiKey,
        modelId,
        systemInstruction,
        prompt,
        controller.signal
      );

      if (attempt.ok && attempt.text && attempt.text.length > 15) {
        res.status(200).json({ text: attempt.text, modelUsed: modelId });
        return;
      }

      lastStatus = attempt.status;
      lastError = attempt.errorMessage || lastError;

      if (attempt.status === 401 || attempt.status === 403) {
        break;
      }

      if (attempt.status === 404 && !discovered) {
        discovered = true;
        const liveModels = await discoverModels(apiKey, controller.signal);
        for (const m of liveModels) {
          if (!candidates.includes(m)) candidates.push(m);
        }
      }
    }

    res.status(lastStatus).json({ error: lastError.slice(0, 120) });
  } catch {
    res.status(504).json({ error: 'Upstream Gemini request timed out.' });
  } finally {
    clearTimeout(timeoutId);
  }
}
