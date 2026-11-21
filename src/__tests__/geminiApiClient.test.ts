import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkServerGeminiProxy,
  executeLiveGeminiRequest,
  hasClientGeminiKey,
  resetGeminiClientCaches,
} from '../services/geminiApiClient';

describe('geminiApiClient server proxy & client key integration', () => {
  afterEach(() => {
    resetGeminiClientCaches();
    vi.restoreAllMocks();
  });

  it('detects when a valid session key is supplied', () => {
    expect(hasClientGeminiKey('')).toBe(false);
    expect(hasClientGeminiKey('short')).toBe(false);
    expect(hasClientGeminiKey('AIzaSyValidKey1234567890')).toBe(true);
  });

  it('probes /api/gemini and routes live requests securely through the Vercel serverless proxy', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/gemini' && init?.method === 'GET') {
        return new Response(JSON.stringify({ configured: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === '/api/gemini' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            text: 'Server-proxied live Gemini clean-air recommendation for your family.',
            modelUsed: 'gemini-2.5-flash',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return new Response('Not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const configured = await checkServerGeminiProxy();
    expect(configured).toBe(true);

    const response = await executeLiveGeminiRequest(
      'You are AeroGuard AI.',
      'Give me a clean air plan',
      ''
    );

    expect(response.ok).toBe(true);
    expect(response.modelUsed).toBe('gemini-2.5-flash');
    expect(response.text).toContain('Server-proxied live Gemini');
  });
});
