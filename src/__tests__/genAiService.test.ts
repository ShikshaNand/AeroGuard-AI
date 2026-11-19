import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateSmogAssistantAdvice } from '../services/genAiService';
import {
  DEFAULT_FAMILY_PROFILE,
  IAQ_HACKS_CATALOGUE,
  WINTER_SMOG_CITY_PRESETS,
} from '../data/smogPresets';
import {
  calculateCadrAndCorsiSizing,
  simulateIndoorAirQuality,
} from '../domain/iaqCalculator';
import {
  calculateAggregateImpact,
  generateTailoredDailyRoutines,
} from '../domain/impactCalculator';

describe('genAiService live Gemini 404 model auto-discovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('automatically recovers from HTTP 404 by discovering an enabled Gemini model via ListModels', async () => {
    const location = WINTER_SMOG_CITY_PRESETS[0];
    const profile = DEFAULT_FAMILY_PROFILE;
    const iaqSim = simulateIndoorAirQuality(location.pm25, profile, IAQ_HACKS_CATALOGUE.slice(0, 2));
    const cadrSizing = calculateCadrAndCorsiSizing(profile.mainRoomAreaSqM, profile.ceilingHeightM, location.pm25, 5);
    const routines = generateTailoredDailyRoutines(location, profile, new Set());
    const impactSummary = calculateAggregateImpact(routines, [], 100, profile.householdSize);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('gemini-custom-flash-001:generateContent')) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Here is your live Gemini clean-air guidance for Delhi NCR with 4 family members.',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.endsWith('/v1beta/models') || !url.includes(':generateContent')) {
        return new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-custom-flash-001',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        );
      }
      // Return 404 for default candidate fallbacks (gemini-2.5-flash, gemini-2.0-flash, etc.)
      return new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await generateSmogAssistantAdvice(
      'Give me a quick smog plan today',
      { location, profile, iaqSim, cadrSizing, impactSummary },
      'AIzaSyDummyValidLookingKey1234567890'
    );

    expect(result.sourceMode).toBe('gemini-live');
    expect(result.modelUsed).toBe('gemini-custom-flash-001');
    expect(result.content).toContain('live Gemini clean-air guidance');
    expect(result.fallbackNotice).toBeUndefined();
  });
});
