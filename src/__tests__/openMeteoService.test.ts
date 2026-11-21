import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchLiveAirQualityForCoords,
  searchCities,
} from '../services/openMeteoService';

describe('openMeteoService telemetry & resilience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes geocoding responses and clamps out-of-range coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 101,
                name: '<b>Zurich</b>',
                country: 'Switzerland',
                admin1: 'Zurich',
                latitude: 999,
                longitude: -999,
              },
            ],
          }),
          { status: 200 }
        )
      )
    );

    const results = await searchCities('Zurich');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Zurich');
    expect(results[0].latitude).toBe(90);
    expect(results[0].longitude).toBe(-180);
  });

  it('falls back to curated winter presets when geocoding network fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Network offline');
      })
    );

    const results = await searchCities('Lahore');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Lahore');
  });

  it('deduplicates concurrent in-flight AQI requests for identical coordinates', async () => {
    let fetchCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        fetchCalls += 1;
        const url = String(input);
        if (url.includes('air-quality-api')) {
          return new Response(
            JSON.stringify({
              current: { pm2_5: 88, pm10: 130, nitrogen_dioxide: 42, us_aqi: 168 },
              hourly: { time: [] },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            current: { temperature_2m: 4.5, relative_humidity_2m: 74, wind_speed_10m: 3.2 },
            hourly: {},
          }),
          { status: 200 }
        );
      })
    );

    const [a, b] = await Promise.all([
      fetchLiveAirQualityForCoords('Almaty', 'Kazakhstan', 43.222, 76.851),
      fetchLiveAirQualityForCoords('Almaty', 'Kazakhstan', 43.222, 76.851),
    ]);

    expect(a.isLiveApi).toBe(true);
    expect(a.pm25).toBe(88);
    expect(a.stagnationOutlook).toBeDefined();
    expect(b).toEqual(a);
    // Only 1 pair of (air-quality + weather) requests should have fired despite 2 concurrent calls
    expect(fetchCalls).toBe(2);
  });

  it('returns simulated winter inversion fallback gracefully when live telemetry fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Service Unavailable', { status: 503 }))
    );

    const loc = await fetchLiveAirQualityForCoords('Bishkek', 'Kyrgyzstan', 42.874, 74.569);
    expect(loc.isLiveApi).toBe(false);
    expect(loc.city).toBe('Bishkek');
    expect(loc.hourlyForecast).toHaveLength(24);
  });
});
