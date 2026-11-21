/**
 * Open-Meteo Real-Time Air Quality & Weather Telemetry Service
 * Provides geocoding city lookup and live 24-hour atmospheric/pollutant curves
 * with TTL caching, AbortController timeouts, in-flight deduplication, and offline fallback.
 */

import type { HourlyPollutantPoint, LocationAirQuality, StagnationOutlook } from '../types';
import { pm25ToUsAqi } from '../domain/airQualityEngine';
import { buildHourlyWinterCurve, WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import { TTLCache } from '../utils/cache';
import { sanitizeTextInput, validateCoordinates } from '../utils/security';

export interface GeocodingResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoAirQualityResponse {
  current?: {
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
    sulphur_dioxide?: number;
    carbon_monoxide?: number;
    us_aqi?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    nitrogen_dioxide?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    temperature_2m?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
  };
}

const geoCache = new TTLCache<GeocodingResult[]>(10 * 60 * 1000, 40);
const aqiCache = new TTLCache<LocationAirQuality>(5 * 60 * 1000, 30);
const inFlightAqiRequests = new Map<string, Promise<LocationAirQuality>>();
let activeSearchController: AbortController | null = null;

const REQUEST_TIMEOUT_MS = 6500;

/**
 * Searches for cities matching a query string via Open-Meteo Geocoding API,
 * falling back cleanly to curated winter smog presets when offline.
 */
export async function searchCities(rawQuery: string): Promise<GeocodingResult[]> {
  const query = sanitizeTextInput(rawQuery, 80).toLowerCase();
  if (query.length < 2) {
    return [];
  }

  const cached = geoCache.get(query);
  if (cached) {
    return cached;
  }

  if (activeSearchController) {
    activeSearchController.abort();
  }
  const controller = new AbortController();
  activeSearchController = controller;
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=6&language=en&format=json`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Geocoding HTTP ${response.status}`);
    }
    const data = (await response.json()) as { results?: GeocodingResult[] };
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const results: GeocodingResult[] = rawResults.map((item, idx) => {
      const coords = validateCoordinates(item.latitude, item.longitude);
      return {
        id: typeof item.id === 'number' ? item.id : idx,
        name: sanitizeTextInput(item.name, 60) || 'Unknown City',
        country: sanitizeTextInput(item.country, 60) || '',
        admin1: item.admin1 ? sanitizeTextInput(item.admin1, 60) : undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    });
    geoCache.set(query, results);
    return results;
  } catch {
    return WINTER_SMOG_CITY_PRESETS.filter(
      (p) => p.city.toLowerCase().includes(query) || p.country.toLowerCase().includes(query)
    ).map((p, idx) => ({
      id: 9000 + idx,
      name: p.city,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
    }));
  } finally {
    clearTimeout(timeoutId);
    if (activeSearchController === controller) {
      activeSearchController = null;
    }
  }
}

function buildHourlyForecastPoints(
  aqData: OpenMeteoAirQualityResponse,
  weatherData: OpenMeteoWeatherResponse,
  baseline: { pm25: number; pm10: number; no2: number; tempC: number; windKmh: number }
): HourlyPollutantPoint[] {
  const hourlyTimes = aqData.hourly?.time ?? [];
  if (hourlyTimes.length < 24) {
    return buildHourlyWinterCurve(
      baseline.pm25,
      baseline.pm10,
      baseline.no2,
      baseline.tempC,
      baseline.windKmh
    );
  }

  const rawPoints: HourlyPollutantPoint[] = hourlyTimes.slice(0, 24).map((_, idx) => {
    const hPm25 = Math.max(3, Math.round(aqData.hourly?.pm2_5?.[idx] ?? baseline.pm25));
    const hPm10 = Math.max(hPm25, Math.round(aqData.hourly?.pm10?.[idx] ?? baseline.pm10));
    const hNo2 = Math.max(3, Math.round(aqData.hourly?.nitrogen_dioxide?.[idx] ?? baseline.no2));
    const hTemp = Number((weatherData.hourly?.temperature_2m?.[idx] ?? baseline.tempC).toFixed(1));
    const hWind = Number((weatherData.hourly?.wind_speed_10m?.[idx] ?? baseline.windKmh).toFixed(1));
    const hAqi = aqData.hourly?.us_aqi?.[idx] ?? pm25ToUsAqi(hPm25);

    return {
      hourLabel: `${String(idx).padStart(2, '0')}:00`,
      hourIndex: idx,
      pm25: hPm25,
      pm10: hPm10,
      no2: hNo2,
      windSpeedKmh: hWind,
      tempC: hTemp,
      usAqi: hAqi,
      isSafeVentilationWindow: false,
      isInversionTrap: false,
    };
  });

  const daytimeSorted = [...rawPoints]
    .filter((p) => p.hourIndex >= 11 && p.hourIndex <= 17)
    .sort((a, b) => a.pm25 - b.pm25);
  const safeSet = new Set(daytimeSorted.slice(0, 3).map((p) => p.hourIndex));
  const trapSet = new Set([...rawPoints].sort((a, b) => b.pm25 - a.pm25).slice(0, 5).map((p) => p.hourIndex));

  return rawPoints.map((p) => ({
    ...p,
    isSafeVentilationWindow: safeSet.has(p.hourIndex),
    isInversionTrap: trapSet.has(p.hourIndex),
  }));
}

function computeThreeDayStagnationOutlook(
  aqData: OpenMeteoAirQualityResponse,
  fallbackPm25: number,
  windSpeedKmh: number
): StagnationOutlook {
  const pmSeries = (aqData.hourly?.pm2_5 ?? []).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );
  if (pmSeries.length < 48) {
    const trend = windSpeedKmh >= 12 ? 'Clearing' : windSpeedKmh <= 6 ? 'Persisting' : 'Rising';
    return {
      trend,
      threeDayAvgPm25: Math.round(fallbackPm25),
      summary:
        trend === 'Clearing'
          ? `Surface winds (${windSpeedKmh} km/h) should gradually disperse stagnant winter haze over the next 72 hours.`
          : `Calm winter boundary layer (${windSpeedKmh} km/h) indicates smog is ${trend.toLowerCase()} over the next 72 hours — keep bedroom filtration active.`,
    };
  }

  const day1Avg = pmSeries.slice(0, 24).reduce((s, v) => s + v, 0) / 24;
  const day3Slice = pmSeries.slice(48, 72);
  const day3Avg = day3Slice.reduce((s, v) => s + v, 0) / Math.max(1, day3Slice.length);
  const threeDayAvgPm25 = Math.round(
    pmSeries.slice(0, 72).reduce((s, v) => s + v, 0) / Math.min(72, pmSeries.length)
  );

  const deltaPct = ((day3Avg - day1Avg) / Math.max(1, day1Avg)) * 100;
  if (deltaPct <= -15) {
    return {
      trend: 'Clearing',
      threeDayAvgPm25,
      summary: `72h outlook shows PM2.5 easing by ~${Math.round(Math.abs(deltaPct))}% (3-day avg ${threeDayAvgPm25} µg/m³) as atmospheric mixing improves.`,
    };
  }
  if (deltaPct >= 15) {
    return {
      trend: 'Rising',
      threeDayAvgPm25,
      summary: `72h stagnation alert: PM2.5 is projected to climb ~${Math.round(deltaPct)}% (3-day avg ${threeDayAvgPm25} µg/m³) — stock N95s and verify filter seals.`,
    };
  }
  return {
    trend: 'Persisting',
    threeDayAvgPm25,
    summary: `Multi-day thermal lid persisting (3-day avg ${threeDayAvgPm25} µg/m³) — maintain afternoon pulse ventilation and overnight room filtration.`,
  };
}

function parseOpenMeteoTelemetry(
  meta: { city: string; country: string; latitude: number; longitude: number; cacheKey: string },
  aqData: OpenMeteoAirQualityResponse,
  weatherData: OpenMeteoWeatherResponse
): LocationAirQuality {
  const pm25 = Math.max(2, Math.round(aqData.current?.pm2_5 ?? 55));
  const pm10 = Math.max(pm25, Math.round(aqData.current?.pm10 ?? pm25 * 1.45));
  const no2 = Math.max(4, Math.round(aqData.current?.nitrogen_dioxide ?? 38));
  const o3 = Math.max(4, Math.round(aqData.current?.ozone ?? 28));
  const so2 = Math.max(2, Math.round(aqData.current?.sulphur_dioxide ?? 12));
  const co = Math.max(120, Math.round(aqData.current?.carbon_monoxide ?? 640));
  const usAqi = aqData.current?.us_aqi ?? pm25ToUsAqi(pm25);

  const temperatureC = Number((weatherData.current?.temperature_2m ?? 9.5).toFixed(1));
  const humidityPct = Math.round(weatherData.current?.relative_humidity_2m ?? 68);
  const windSpeedKmh = Number((weatherData.current?.wind_speed_10m ?? 6.2).toFixed(1));

  return {
    id: `live-${meta.cacheKey}`,
    city: sanitizeTextInput(meta.city, 60),
    country: sanitizeTextInput(meta.country, 60),
    latitude: meta.latitude,
    longitude: meta.longitude,
    isLiveApi: true,
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pm25,
    pm10,
    no2,
    o3,
    so2,
    co,
    usAqi,
    temperatureC,
    humidityPct,
    windSpeedKmh,
    dominantSmogSource:
      windSpeedKmh < 8
        ? `Low surface wind (${windSpeedKmh} km/h) and ${temperatureC}°C boundary layer trapping urban transport NOx (${no2} µg/m³) and fine aerosols.`
        : `Urban particulate load (PM2.5: ${pm25} µg/m³, PM10: ${pm10} µg/m³) moderated by ${windSpeedKmh} km/h surface breeze.`,
    hourlyForecast: buildHourlyForecastPoints(aqData, weatherData, {
      pm25,
      pm10,
      no2,
      tempC: temperatureC,
      windKmh: windSpeedKmh,
    }),
    stagnationOutlook: computeThreeDayStagnationOutlook(aqData, pm25, windSpeedKmh),
  };
}

function findNearestClimatePreset(latitude: number, longitude: number): LocationAirQuality {
  let nearest = WINTER_SMOG_CITY_PRESETS[0];
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (const preset of WINTER_SMOG_CITY_PRESETS) {
    const dLat = preset.latitude - latitude;
    const dLon = preset.longitude - longitude;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      nearest = preset;
    }
  }
  return nearest;
}

function buildOfflineFallbackLocation(
  city: string,
  country: string,
  latitude: number,
  longitude: number,
  cacheKey: string
): LocationAirQuality {
  const ref = findNearestClimatePreset(latitude, longitude);
  return {
    id: `fallback-${cacheKey}`,
    city: sanitizeTextInput(city, 60),
    country: sanitizeTextInput(country, 60),
    latitude,
    longitude,
    isLiveApi: false,
    updatedAt: `Offline Benchmark (Near ${ref.city})`,
    pm25: ref.pm25,
    pm10: ref.pm10,
    no2: ref.no2,
    o3: ref.o3,
    so2: ref.so2,
    co: ref.co,
    usAqi: ref.usAqi,
    temperatureC: ref.temperatureC,
    humidityPct: ref.humidityPct,
    windSpeedKmh: ref.windSpeedKmh,
    dominantSmogSource: `Offline winter inversion estimate calibrated to nearby ${ref.city} regional meteorology.`,
    hourlyForecast: buildHourlyWinterCurve(
      ref.pm25,
      ref.pm10,
      ref.no2,
      ref.temperatureC,
      ref.windSpeedKmh
    ),
  };
}

/**
 * Fetches live air quality (PM2.5, PM10, NO2, O3, SO2, CO, US AQI) and boundary-layer
 * meteorology (temperature, humidity, wind speed) from Open-Meteo for any coordinates.
 */
export async function fetchLiveAirQualityForCoords(
  city: string,
  country: string,
  rawLatitude: number,
  rawLongitude: number
): Promise<LocationAirQuality> {
  const { latitude, longitude } = validateCoordinates(rawLatitude, rawLongitude);
  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = aqiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const existingInFlight = inFlightAqiRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const requestPromise = (async (): Promise<LocationAirQuality> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&hourly=pm10,pm2_5,nitrogen_dioxide,us_aqi&forecast_days=3`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,wind_speed_10m&forecast_days=3`;

      const [aqRes, weatherRes] = await Promise.all([
        fetch(aqUrl, { signal: controller.signal }),
        fetch(weatherUrl, { signal: controller.signal }),
      ]);

      if (!aqRes.ok || !weatherRes.ok) {
        throw new Error('Open-Meteo live telemetry unavailable');
      }

      const [aqData, weatherData] = (await Promise.all([aqRes.json(), weatherRes.json()])) as [
        OpenMeteoAirQualityResponse,
        OpenMeteoWeatherResponse,
      ];

      const result = parseOpenMeteoTelemetry(
        { city, country, latitude, longitude, cacheKey },
        aqData,
        weatherData
      );
      aqiCache.set(cacheKey, result);
      return result;
    } catch {
      return buildOfflineFallbackLocation(city, country, latitude, longitude, cacheKey);
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  inFlightAqiRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightAqiRequests.delete(cacheKey);
  }
}
