/**
 * Hybrid GenAI Smog & Sustainability Advisor Service
 * Combines live Google Gemini (gemini-2.5-flash) generation with a deterministic,
 * context-aware Environmental Science Engine so the assistant works accurately
 * both with and without external API credentials, dynamically adapting to every
 * change in city telemetry and family member counts.
 */

import type {
  CADRSizingResult,
  FamilyProfile,
  LocationAirQuality,
} from '../types';
import {
  calculateCigaretteEquivalent,
  calculateWhoMultiple,
  findOptimalVentilationWindows,
} from '../domain/airQualityEngine';
import {
  synthesizeExpertScienceResponse,
  type ExpertAdviceContext,
} from '../domain/expertAdviceEngine';
import type { IndoorAirSimulationResult } from '../domain/iaqCalculator';
import type { AggregateImpactSummary } from '../domain/impactCalculator';
import { TTLCache } from '../utils/cache';
import {
  sanitizeTextInput,
  SlidingWindowRateLimiter,
  validatePromptSafety,
} from '../utils/security';

export interface AssistantContextPayload {
  location: LocationAirQuality;
  profile: FamilyProfile;
  iaqSim: IndoorAirSimulationResult;
  cadrSizing: CADRSizingResult;
  impactSummary: AggregateImpactSummary;
}

export interface GenAIResponsePayload {
  content: string;
  sourceMode: 'gemini-live' | 'expert-engine';
  keyMetricsCited: string[];
  modelUsed?: string;
  fallbackNotice?: string;
}

const responseCache = new TTLCache<GenAIResponsePayload>(5 * 60 * 1000, 40);
const rateLimiter = new SlidingWindowRateLimiter(15, 60_000);

/** Remembers the first verified working Gemini model for the current API key in RAM */
let cachedWorkingGeminiModel: string | null = null;
let cachedKeySignature = '';

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

interface GeminiListModelItem {
  name?: string;
  supportedGenerationMethods?: string[];
}

/**
 * Discovers live Gemini text models available for the user's API key via ListModels,
 * prioritizing fast flash models that support generateContent.
 */
async function discoverAvailableGeminiModels(
  apiKey: string,
  signal: AbortSignal
): Promise<string[]> {
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        headers: {
          'x-goog-api-key': apiKey,
        },
        signal,
      }
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { models?: GeminiListModelItem[] };
    const models = Array.isArray(data.models) ? data.models : [];

    const textModels = models
      .filter(
        (m) =>
          typeof m.name === 'string' &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          m.name.toLowerCase().includes('gemini') &&
          !m.name.toLowerCase().includes('embedding') &&
          !m.name.toLowerCase().includes('vision-only') &&
          !m.name.toLowerCase().includes('tts') &&
          !m.name.toLowerCase().includes('image')
      )
      .map((m) => (m.name as string).replace(/^models\//, ''));

    // Prioritize flash models (fast & generous free-tier quota), then pro, then others
    return textModels.sort((a, b) => {
      const score = (id: string) => {
        const low = id.toLowerCase();
        if (low.includes('2.5-flash') && !low.includes('lite')) return 1;
        if (low.includes('2.0-flash') && !low.includes('lite')) return 2;
        if (low.includes('flash')) return 3;
        if (low.includes('pro')) return 4;
        return 5;
      };
      return score(a) - score(b);
    });
  } catch {
    return [];
  }
}

async function invokeGeminiGenerateContent(
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
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 750,
        },
      }),
    }
  );

  if (res.ok) {
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return { ok: true, status: res.status, text };
  }

  let errorMessage: string | undefined;
  try {
    const errJson = (await res.json()) as { error?: { message?: string } };
    errorMessage = errJson.error?.message;
  } catch {
    // ignore JSON parse error on non-JSON failure
  }

  return { ok: false, status: res.status, errorMessage };
}

function describeFamilyMembers(profile: FamilyProfile): string {
  const parts: string[] = [];
  if (profile.adultsCount > 0) {
    parts.push(`${profile.adultsCount} adult${profile.adultsCount > 1 ? 's' : ''}`);
  }
  if (profile.childrenCount > 0) {
    parts.push(`${profile.childrenCount} child${profile.childrenCount > 1 ? 'ren' : ''}`);
  }
  if (profile.seniorsCount > 0) {
    parts.push(`${profile.seniorsCount} senior${profile.seniorsCount > 1 ? 's' : ''} (65+)`);
  }
  if (profile.respiratoryCareCount > 0) {
    parts.push(`${profile.respiratoryCareCount} with asthma/breathing care`);
  }
  if (profile.petsCount > 0) {
    parts.push(`${profile.petsCount} pet${profile.petsCount > 1 ? 's' : ''}`);
  }
  return parts.length > 0 ? parts.join(', ') : `${profile.householdSize} member(s)`;
}

function buildProfileFingerprint(
  profile: FamilyProfile,
  optimizedIndoorPm25: number
): string {
  return [
    profile.familyName,
    profile.householdSize,
    profile.adultsCount,
    profile.childrenCount,
    profile.seniorsCount,
    profile.respiratoryCareCount,
    profile.petsCount,
    profile.commuteMode,
    profile.dailyCommuteKm,
    profile.heatingType,
    profile.cookingType,
    profile.homeSealing,
    profile.mainRoomAreaSqM,
    optimizedIndoorPm25,
  ].join('|');
}

interface LiveGeminiOutcome {
  payload?: GenAIResponsePayload;
  fallbackNotice?: string;
}

async function resolveLiveGeminiResponse(
  apiKey: string,
  prompt: string,
  adviceContext: ExpertAdviceContext,
  keyMetricsCited: string[]
): Promise<LiveGeminiOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14_000);

  try {
    const keySig = apiKey.slice(-6);
    if (keySig !== cachedKeySignature) {
      cachedWorkingGeminiModel = null;
      cachedKeySignature = keySig;
    }

    const systemInstruction = buildSystemContextPrompt(adviceContext);
    const candidates = cachedWorkingGeminiModel
      ? [
          cachedWorkingGeminiModel,
          ...DEFAULT_GEMINI_MODELS.filter((m) => m !== cachedWorkingGeminiModel),
        ]
      : [...DEFAULT_GEMINI_MODELS];

    let lastStatus = 0;
    let lastErrorMsg = '';
    let discovered = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const modelId = candidates[i];
      const attempt = await invokeGeminiGenerateContent(
        apiKey,
        modelId,
        systemInstruction,
        prompt,
        controller.signal
      );

      if (attempt.ok && attempt.text && attempt.text.length > 15) {
        cachedWorkingGeminiModel = modelId;
        return {
          payload: {
            content: attempt.text,
            sourceMode: 'gemini-live',
            modelUsed: modelId,
            keyMetricsCited,
          },
        };
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
        const liveModels = await discoverAvailableGeminiModels(apiKey, controller.signal);
        for (const discoveredModel of liveModels) {
          if (!candidates.includes(discoveredModel)) {
            candidates.push(discoveredModel);
          }
        }
      }
    }

    const safeDetail = lastErrorMsg ? ` (${sanitizeTextInput(lastErrorMsg, 90)})` : '';
    return {
      fallbackNotice: `Live Gemini API returned HTTP ${lastStatus || 'error'}${safeDetail} — answered instantly using our built-in science engine.`,
    };
  } catch {
    return {
      fallbackNotice:
        'Could not reach live Gemini API (offline or timeout) — answered instantly using our built-in science engine.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates a tailored, context-grounded response for the user's question.
 * Uses Live Gemini API if an API key is provided, and seamlessly falls back
 * to the deterministic Environmental Science Engine otherwise.
 */
export async function generateSmogAssistantAdvice(
  rawPrompt: string,
  context: AssistantContextPayload,
  sessionApiKey?: string
): Promise<GenAIResponsePayload> {
  const validation = validatePromptSafety(rawPrompt, 600);
  if (!validation.isValid) {
    return {
      content: `⚠️ **Input Guardrail Notice:** ${validation.reason}`,
      sourceMode: 'expert-engine',
      keyMetricsCited: ['Input Security Check'],
    };
  }

  if (!rateLimiter.tryAcquire()) {
    return {
      content:
        '⏳ **Please wait a moment:** You have sent several messages quickly. Try again in a few seconds.',
      sourceMode: 'expert-engine',
      keyMetricsCited: ['Rate Limiter'],
    };
  }

  const prompt = validation.sanitizedPrompt;
  const { location, profile, iaqSim, cadrSizing, impactSummary } = context;
  const ventWindow = findOptimalVentilationWindows(location.hourlyForecast);
  const whoMultiple = calculateWhoMultiple(location.pm25);
  const cigsEq = calculateCigaretteEquivalent(location.pm25);
  const memberSummary = describeFamilyMembers(profile);

  const keyMetricsCited = [
    `${location.city}: AQI ${location.usAqi} (PM2.5 ${location.pm25} µg/m³)`,
    `Family: ${profile.householdSize} total (${memberSummary})`,
    `Best Window: ${ventWindow.bestWindowLabel}`,
    `Indoor Air: ${iaqSim.baselineIndoorPm25} → ${iaqSim.optimizedIndoorPm25} µg/m³`,
  ];

  const envKey = import.meta.env?.VITE_GEMINI_API_KEY ?? '';
  const effectiveKey = sessionApiKey?.trim() || envKey.trim();
  const profileFingerprint = buildProfileFingerprint(profile, iaqSim.optimizedIndoorPm25);
  const cacheKey = `${effectiveKey ? 'live' : 'local'}:${location.id}:${location.pm25}:${profileFingerprint}:${prompt.toLowerCase()}`;

  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const adviceContext: ExpertAdviceContext = {
    location,
    profile,
    memberSummary,
    iaqSim,
    cadrSizing,
    impactSummary,
    bestVentWindow: ventWindow.bestWindowLabel,
    bestVentPm25: ventWindow.bestWindowAvgPm25,
    worstTrapWindow: ventWindow.worstTrapLabel,
    worstTrapPm25: ventWindow.worstTrapAvgPm25,
    whoMultiple,
    cigsEq,
  };

  let fallbackNotice: string | undefined;
  if (effectiveKey.length >= 16) {
    const liveOutcome = await resolveLiveGeminiResponse(
      effectiveKey,
      prompt,
      adviceContext,
      keyMetricsCited
    );
    if (liveOutcome.payload) {
      responseCache.set(cacheKey, liveOutcome.payload);
      return liveOutcome.payload;
    }
    fallbackNotice = liveOutcome.fallbackNotice;
  }

  const fallbackResult: GenAIResponsePayload = {
    content: synthesizeExpertScienceResponse(prompt, adviceContext),
    sourceMode: 'expert-engine',
    keyMetricsCited,
    fallbackNotice,
  };
  if (!fallbackNotice) {
    responseCache.set(cacheKey, fallbackResult);
  }
  return fallbackResult;
}

function buildSystemContextPrompt(ctx: ExpertAdviceContext): string {
  const { location, profile, memberSummary, iaqSim, cadrSizing, impactSummary, bestVentWindow, whoMultiple, cigsEq } =
    ctx;
  return [
    'You are AeroGuard AI, a friendly, clear environmental scientist and family clean-air coach.',
    `Current Location: ${location.city}, ${location.country} | US AQI: ${location.usAqi} | PM2.5: ${location.pm25} µg/m³ (${whoMultiple}x WHO limit, ~${cigsEq} passive cigarettes/day) | PM10: ${location.pm10} µg/m³ | NO2: ${location.no2} µg/m³ | Temp: ${location.temperatureC}°C | Wind: ${location.windSpeedKmh} km/h.`,
    `Best Afternoon Ventilation Window Today: ${bestVentWindow}.`,
    `Household Profile ("${profile.familyName}", ${profile.householdSize} total people): ${memberSummary}. Commute: ${profile.commuteMode} (${profile.dailyCommuteKm} km/day). Heating: ${profile.heatingType}. Cooking: ${profile.cookingType}. Main room: ${profile.mainRoomAreaSqM} m² (${cadrSizing.roomVolumeCubicM} m³).`,
    `Indoor Air Simulation: Baseline ${iaqSim.baselineIndoorPm25} µg/m³ -> Optimized ${iaqSim.optimizedIndoorPm25} µg/m³ (-${iaqSim.reductionPct}%). Required CADR for ${cadrSizing.targetAirChangesPerHour} ACH: ${cadrSizing.requiredCadrCubicMPerHour} m³/h (${cadrSizing.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal box).`,
    `Direct Impact Potential: ${impactSummary.dailyPersonalDoseSavedUg} µg/day inhaled PM2.5 avoided per person (${impactSummary.familyWinterDoseSavedMg} mg across all ${profile.householdSize} members over winter); ${impactSummary.householdDailyCo2SavedKg} kg CO2e/day and ${impactSummary.householdDailyPmAndNoxSavedGrams} g PM2.5+NOx/day saved.`,
    'Respond in warm, simple, easy-to-read English with clear bullet points, referencing their exact family member counts and live numbers, and include a clear "Direct Impact Explained" summary.',
  ].join('\n');
}
