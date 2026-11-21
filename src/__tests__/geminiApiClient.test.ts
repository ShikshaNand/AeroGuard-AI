import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkServerGeminiProxy,
  executeLiveGeminiRequest,
  hasClientGeminiKey,
  resetGeminiClientCaches,
} from '../services/geminiApiClient';
import type { GroundedPromptContext } from '../services/geminiProtocol';

const SAMPLE_CONTEXT: GroundedPromptContext = {
  city: 'Delhi NCR',
  country: 'India',
  usAqi: 346,
  pm25: 248,
  pm10: 395,
  no2: 78,
  temperatureC: 11.2,
  windSpeedKmh: 4.5,
  whoMultiple: 16.5,
  cigsEq: 11.3,
  bestVentWindow: '14:00 – 16:00',
  familyName: 'My Family',
  householdSize: 4,
  memberSummary: '2 adults, 1 child, 1 senior',
  commuteMode: 'car_solo_ice',
  dailyCommuteKm: 18,
  heatingType: 'gas_furnace',
  cookingType: 'lpg_gas_unvented',
  mainRoomAreaSqM: 28,
  roomVolumeCubicM: 78.4,
  baselineIndoorPm25: 188,
  optimizedIndoorPm25: 28,
  reductionPct: 85,
  targetAch: 5,
  requiredCadrCubicMPerHour: 392,
  corsiRosenthalBoxesNeeded: 1,
  dailyPersonalDoseSavedUg: 320,
  familyWinterDoseSavedMg: 115.2,
  householdDailyCo2SavedKg: 4.5,
  householdDailyPmAndNoxSavedGrams: 20.7,
};

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

  it('probes /api/gemini and routes live requests via structured context (never raw system prompt)', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/gemini' && init?.method === 'GET') {
        return new Response(JSON.stringify({ configured: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === '/api/gemini' && init?.method === 'POST') {
        capturedBody = JSON.parse(String(init.body)) as Record<string, unknown>;
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
      'Give me a clean air plan',
      SAMPLE_CONTEXT,
      ''
    );

    expect(response.ok).toBe(true);
    expect(response.modelUsed).toBe('gemini-2.5-flash');
    expect(response.text).toContain('Server-proxied live Gemini');
    // Verify client sends structured context and never a raw systemInstruction
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).not.toHaveProperty('systemInstruction');
    expect(capturedBody).toHaveProperty('context');
  });
});
