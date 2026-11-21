/**
 * Shared Google Gemini HTTP Protocol & Grounded System Prompt Builder
 * Used by BOTH the Vercel Serverless Proxy (`api/gemini.ts`) and the browser
 * client (`src/services/geminiApiClient.ts`) — single source of truth with zero
 * duplicated fetch, model-ranking, or 404 ListModels discovery logic.
 */

import { sanitizeTextInput } from '../utils/security';

export const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
] as const;

export interface GroundedPromptContext {
  city: string;
  country: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  temperatureC: number;
  windSpeedKmh: number;
  whoMultiple: number;
  cigsEq: number;
  bestVentWindow: string;
  familyName: string;
  householdSize: number;
  memberSummary: string;
  commuteMode: string;
  dailyCommuteKm: number;
  heatingType: string;
  cookingType: string;
  mainRoomAreaSqM: number;
  roomVolumeCubicM: number;
  baselineIndoorPm25: number;
  optimizedIndoorPm25: number;
  reductionPct: number;
  targetAch: number;
  requiredCadrCubicMPerHour: number;
  corsiRosenthalBoxesNeeded: number;
  dailyPersonalDoseSavedUg: number;
  familyWinterDoseSavedMg: number;
  householdDailyCo2SavedKg: number;
  householdDailyPmAndNoxSavedGrams: number;
}

interface GeminiListModelItem {
  name?: string;
  supportedGenerationMethods?: string[];
}

export interface GeminiAttemptResult {
  ok: boolean;
  status: number;
  text?: string;
  errorMessage?: string;
}

export interface GeminiFallbackResult {
  ok: boolean;
  status: number;
  text?: string;
  modelUsed?: string;
  errorMessage?: string;
}

function safeNum(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates and sanitizes an untrusted context payload (e.g. from an HTTP request body)
 * before constructing a server-side system instruction.
 */
export function sanitizeGroundedPromptContext(raw: unknown): GroundedPromptContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const city = typeof o.city === 'string' ? sanitizeTextInput(o.city, 60) : '';
  if (!city) return null;

  return {
    city,
    country: typeof o.country === 'string' ? sanitizeTextInput(o.country, 60) : '',
    usAqi: safeNum(o.usAqi, 0, 500, 150),
    pm25: safeNum(o.pm25, 0, 1500, 100),
    pm10: safeNum(o.pm10, 0, 2500, 150),
    no2: safeNum(o.no2, 0, 1000, 40),
    temperatureC: safeNum(o.temperatureC, -50, 60, 10),
    windSpeedKmh: safeNum(o.windSpeedKmh, 0, 150, 5),
    whoMultiple: safeNum(o.whoMultiple, 0, 200, 6),
    cigsEq: safeNum(o.cigsEq, 0, 100, 4),
    bestVentWindow:
      typeof o.bestVentWindow === 'string'
        ? sanitizeTextInput(o.bestVentWindow, 32) || '14:00 – 16:00'
        : '14:00 – 16:00',
    familyName:
      typeof o.familyName === 'string' ? sanitizeTextInput(o.familyName, 40) || 'My Family' : 'My Family',
    householdSize: safeNum(o.householdSize, 1, 30, 4),
    memberSummary:
      typeof o.memberSummary === 'string' ? sanitizeTextInput(o.memberSummary, 140) : '4 members',
    commuteMode: typeof o.commuteMode === 'string' ? sanitizeTextInput(o.commuteMode, 32) : 'car_solo_ice',
    dailyCommuteKm: safeNum(o.dailyCommuteKm, 1, 150, 15),
    heatingType: typeof o.heatingType === 'string' ? sanitizeTextInput(o.heatingType, 32) : 'gas_furnace',
    cookingType: typeof o.cookingType === 'string' ? sanitizeTextInput(o.cookingType, 32) : 'lpg_gas_unvented',
    mainRoomAreaSqM: safeNum(o.mainRoomAreaSqM, 8, 250, 28),
    roomVolumeCubicM: safeNum(o.roomVolumeCubicM, 18, 1200, 78),
    baselineIndoorPm25: safeNum(o.baselineIndoorPm25, 0, 1500, 120),
    optimizedIndoorPm25: safeNum(o.optimizedIndoorPm25, 0, 1500, 25),
    reductionPct: safeNum(o.reductionPct, 0, 100, 75),
    targetAch: safeNum(o.targetAch, 2, 10, 5),
    requiredCadrCubicMPerHour: safeNum(o.requiredCadrCubicMPerHour, 40, 10000, 390),
    corsiRosenthalBoxesNeeded: safeNum(o.corsiRosenthalBoxesNeeded, 1, 20, 1),
    dailyPersonalDoseSavedUg: safeNum(o.dailyPersonalDoseSavedUg, 0, 50000, 200),
    familyWinterDoseSavedMg: safeNum(o.familyWinterDoseSavedMg, 0, 50000, 50),
    householdDailyCo2SavedKg: safeNum(o.householdDailyCo2SavedKg, 0, 500, 4),
    householdDailyPmAndNoxSavedGrams: safeNum(o.householdDailyPmAndNoxSavedGrams, 0, 5000, 15),
  };
}

/**
 * Constructs a grounded, non-overrideable system instruction strictly from
 * sanitized atmospheric and household parameters.
 */
export function buildGroundedSystemPrompt(ctx: GroundedPromptContext): string {
  return [
    'You are AeroGuard AI, a friendly, clear environmental scientist and family clean-air coach.',
    `Current Location: ${ctx.city}, ${ctx.country} | US AQI: ${ctx.usAqi} | PM2.5: ${ctx.pm25} µg/m³ (${ctx.whoMultiple}x WHO limit, ~${ctx.cigsEq} passive cigarettes/day) | PM10: ${ctx.pm10} µg/m³ | NO2: ${ctx.no2} µg/m³ | Temp: ${ctx.temperatureC}°C | Wind: ${ctx.windSpeedKmh} km/h.`,
    `Best Afternoon Ventilation Window Today: ${ctx.bestVentWindow}.`,
    `Household Profile ("${ctx.familyName}", ${ctx.householdSize} total people): ${ctx.memberSummary}. Commute: ${ctx.commuteMode} (${ctx.dailyCommuteKm} km/day). Heating: ${ctx.heatingType}. Cooking: ${ctx.cookingType}. Main room: ${ctx.mainRoomAreaSqM} m² (${ctx.roomVolumeCubicM} m³).`,
    `Indoor Air Simulation: Baseline ${ctx.baselineIndoorPm25} µg/m³ -> Optimized ${ctx.optimizedIndoorPm25} µg/m³ (-${ctx.reductionPct}%). Required CADR for ${ctx.targetAch} ACH: ${ctx.requiredCadrCubicMPerHour} m³/h (${ctx.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal box).`,
    `Direct Impact Potential: ${ctx.dailyPersonalDoseSavedUg} µg/day inhaled PM2.5 avoided per person (${ctx.familyWinterDoseSavedMg} mg across all ${ctx.householdSize} members over winter); ${ctx.householdDailyCo2SavedKg} kg CO2e/day and ${ctx.householdDailyPmAndNoxSavedGrams} g PM2.5+NOx/day saved.`,
    'Respond in warm, simple, easy-to-read English with clear bullet points, referencing their exact family member counts and live numbers, and include a clear "Direct Impact Explained" summary.',
  ].join('\n');
}

export async function discoverGeminiTextModels(
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

export async function invokeGeminiModel(
  apiKey: string,
  modelId: string,
  systemInstruction: string,
  prompt: string,
  signal: AbortSignal
): Promise<GeminiAttemptResult> {
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
 * Calls Gemini across ordered candidate models, automatically discovering enabled
 * models via ListModels on HTTP 404 and stopping early on invalid API keys (401/403).
 */
export async function callGeminiWithFallback(
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  signal: AbortSignal,
  preferredModel?: string | null
): Promise<GeminiFallbackResult> {
  const candidates: string[] = preferredModel
    ? [preferredModel, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== preferredModel)]
    : [...DEFAULT_GEMINI_MODELS];

  let lastStatus = 0;
  let lastErrorMsg = '';
  let discovered = false;

  for (let i = 0; i < candidates.length; i += 1) {
    const modelId = candidates[i];
    const attempt = await invokeGeminiModel(apiKey, modelId, systemInstruction, prompt, signal);

    if (attempt.ok && attempt.text && attempt.text.length > 15) {
      return { ok: true, status: attempt.status, text: attempt.text, modelUsed: modelId };
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
      const liveModels = await discoverGeminiTextModels(apiKey, signal);
      for (const m of liveModels) {
        if (!candidates.includes(m)) {
          candidates.push(m);
        }
      }
    }
  }

  return {
    ok: false,
    status: lastStatus || 502,
    errorMessage: lastErrorMsg ? sanitizeTextInput(lastErrorMsg, 120) : undefined,
  };
}
