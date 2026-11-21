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

  it('returns nearest-city calibrated offline fallback when live telemetry fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Service Unavailable', { status: 503 }))
    );

    // Coordinates near Milan Po Valley (45.46, 9.19)
    const milanNeighbor = await fetchLiveAirQualityForCoords('Turin', 'Italy', 45.07, 7.68);
    expect(milanNeighbor.isLiveApi).toBe(false);
    expect(milanNeighbor.city).toBe('Turin');
    expect(milanNeighbor.hourlyForecast).toHaveLength(24);
    expect(milanNeighbor.updatedAt).toContain('Milan');
  });

  it('computes 72-hour Clearing, Rising, and Persisting stagnation outlooks from hourly PM2.5 series', async () => {
    const makeSeries = (day1: number, day2: number, day3: number) => [
      ...Array.from({ length: 24 }, () => day1),
      ...Array.from({ length: 24 }, () => day2),
      ...Array.from({ length: 24 }, () => day3),
    ];
    const times = Array.from({ length: 72 }, (_, i) => `2026-01-01T${String(i % 24).padStart(2, '0')}:00`);

    const mockTelemetry = (pmSeries: number[], wind: number) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes('air-quality-api')) {
            return new Response(
              JSON.stringify({
                current: { pm2_5: pmSeries[0], pm10: pmSeries[0] * 1.4, nitrogen_dioxide: 40 },
                hourly: { time: times, pm2_5: pmSeries },
              }),
              { status: 200 }
            );
          }
          return new Response(
            JSON.stringify({
              current: { temperature_2m: 2.5, relative_humidity_2m: 72, wind_speed_10m: wind },
              hourly: {
                temperature_2m: Array.from({ length: 72 }, () => 2.5),
                wind_speed_10m: Array.from({ length: 72 }, () => wind),
              },
            }),
            { status: 200 }
          );
        })
      );
    };

    mockTelemetry(makeSeries(120, 95, 70), 14);
    const clearing = await fetchLiveAirQualityForCoords('CityA', 'Test', 51.1, 10.1);
    expect(clearing.stagnationOutlook?.trend).toBe('Clearing');

    mockTelemetry(makeSeries(60, 85, 115), 4);
    const rising = await fetchLiveAirQualityForCoords('CityB', 'Test', 52.2, 11.2);
    expect(rising.stagnationOutlook?.trend).toBe('Rising');

    mockTelemetry(makeSeries(90, 92, 94), 5);
    const persisting = await fetchLiveAirQualityForCoords('CityC', 'Test', 53.3, 12.3);
    expect(persisting.stagnationOutlook?.trend).toBe('Persisting');
  });
});
