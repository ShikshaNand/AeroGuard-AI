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
  getAQISeverityMetadata,
} from '../domain/airQualityEngine';
import type { IndoorAirSimulationResult } from '../domain/iaqCalculator';
import type { AggregateImpactSummary } from '../domain/impactCalculator';
import { TTLCache } from '../utils/cache';
import { SlidingWindowRateLimiter, validatePromptSafety } from '../utils/security';

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

  const envKey =
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.VITE_GEMINI_API_KEY) ||
    '';
  const effectiveKey = sessionApiKey?.trim() || envKey.trim();

  // Include all dynamic member counts and home attributes in the cache key
  const profileFingerprint = [
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
    iaqSim.optimizedIndoorPm25,
  ].join('|');

  const cacheKey = `${effectiveKey ? 'live' : 'local'}:${location.id}:${location.pm25}:${profileFingerprint}:${prompt.toLowerCase()}`;
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let fallbackNotice: string | undefined;

  if (effectiveKey.length >= 16) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14_000);

    try {
      const keySig = effectiveKey.slice(-6);
      if (keySig !== cachedKeySignature) {
        cachedWorkingGeminiModel = null;
        cachedKeySignature = keySig;
      }

      const systemInstruction = buildSystemContextPrompt(
        location,
        profile,
        memberSummary,
        iaqSim,
        cadrSizing,
        impactSummary,
        ventWindow.bestWindowLabel,
        whoMultiple,
        cigsEq
      );

      // Build ordered candidate list starting with cached verified model if known
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
          effectiveKey,
          modelId,
          systemInstruction,
          prompt,
          controller.signal
        );

        if (attempt.ok && attempt.text && attempt.text.length > 15) {
          cachedWorkingGeminiModel = modelId;
          const result: GenAIResponsePayload = {
            content: attempt.text,
            sourceMode: 'gemini-live',
            modelUsed: modelId,
            keyMetricsCited,
          };
          responseCache.set(cacheKey, result);
          return result;
        }

        lastStatus = attempt.status;
        lastErrorMsg = attempt.errorMessage || '';

        // If the API key itself is unauthorized (401/403) or bad key (400 API key invalid), stop trying models
        if (
          attempt.status === 401 ||
          attempt.status === 403 ||
          (attempt.status === 400 && lastErrorMsg.toLowerCase().includes('api key'))
        ) {
          break;
        }

        // On first 404 (model not found for this key/region), dynamically discover enabled models
        if (attempt.status === 404 && !discovered) {
          discovered = true;
          const liveModels = await discoverAvailableGeminiModels(
            effectiveKey,
            controller.signal
          );
          for (const discoveredModel of liveModels) {
            if (!candidates.includes(discoveredModel)) {
              candidates.push(discoveredModel);
            }
          }
        }
      }

      const detail = lastErrorMsg ? ` (${lastErrorMsg.slice(0, 90)})` : '';
      fallbackNotice = `Live Gemini API returned HTTP ${lastStatus || 'error'}${detail} — answered instantly using our built-in science engine.`;
    } catch {
      fallbackNotice =
        'Could not reach live Gemini API (offline or timeout) — answered instantly using our built-in science engine.';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const expertContent = synthesizeExpertScienceResponse(
    prompt,
    location,
    profile,
    memberSummary,
    iaqSim,
    cadrSizing,
    impactSummary,
    ventWindow.bestWindowLabel,
    ventWindow.bestWindowAvgPm25,
    ventWindow.worstTrapLabel,
    ventWindow.worstTrapAvgPm25,
    whoMultiple,
    cigsEq
  );

  const fallbackResult: GenAIResponsePayload = {
    content: expertContent,
    sourceMode: 'expert-engine',
    keyMetricsCited,
    fallbackNotice,
  };
  // Only cache deterministic local answers when no live fallback error occurred
  if (!fallbackNotice) {
    responseCache.set(cacheKey, fallbackResult);
  }
  return fallbackResult;
}

function buildSystemContextPrompt(
  location: LocationAirQuality,
  profile: FamilyProfile,
  memberSummary: string,
  iaqSim: IndoorAirSimulationResult,
  cadrSizing: CADRSizingResult,
  impactSummary: AggregateImpactSummary,
  bestVentWindow: string,
  whoMultiple: number,
  cigsEq: number
): string {
  return [
    'You are AeroGuard AI, a friendly, clear environmental scientist and family clean-air coach.',
    `Current Location: ${location.city}, ${location.country} | US AQI: ${location.usAqi} | PM2.5: ${location.pm25} µg/m³ (${whoMultiple}x WHO limit, ~${cigsEq} passive cigarettes/day) | PM10: ${location.pm10} µg/m³ | NO2: ${location.no2} µg/m³ | Temp: ${location.temperatureC}°C | Wind: ${location.windSpeedKmh} km/h.`,
    `Best Afternoon Ventilation Window Today: ${bestVentWindow}.`,
    `Household Profile ("${profile.familyName}", ${profile.householdSize} total people): ${memberSummary}. Commute: ${profile.commuteMode} (${profile.dailyCommuteKm} km/day). Heating: ${profile.heatingType}. Cooking: ${profile.cookingType}. Main room: ${profile.mainRoomAreaSqM} m² (${cadrSizing.roomVolumeCubicM} m³).`,
    `Indoor Air Simulation: Baseline ${iaqSim.baselineIndoorPm25} µg/m³ -> Optimized ${iaqSim.optimizedIndoorPm25} µg/m³ (-${iaqSim.reductionPct}%). Required CADR for 5 ACH: ${cadrSizing.requiredCadrCubicMPerHour} m³/h (${cadrSizing.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal box).`,
    `Direct Impact Potential: ${impactSummary.dailyPersonalDoseSavedUg} µg/day inhaled PM2.5 avoided per person (${impactSummary.familyWinterDoseSavedMg} mg across all ${profile.householdSize} members over winter); ${impactSummary.householdDailyCo2SavedKg} kg CO2e/day and ${impactSummary.householdDailyPmAndNoxSavedGrams} g PM2.5+NOx/day saved.`,
    'Respond in warm, simple, easy-to-read English with clear bullet points, referencing their exact family member counts and live numbers, and include a clear "Direct Impact Explained" summary.',
  ].join('\n');
}

function synthesizeExpertScienceResponse(
  prompt: string,
  location: LocationAirQuality,
  profile: FamilyProfile,
  memberSummary: string,
  iaqSim: IndoorAirSimulationResult,
  cadrSizing: CADRSizingResult,
  impactSummary: AggregateImpactSummary,
  bestVentWindow: string,
  bestVentPm25: number,
  worstTrapWindow: string,
  worstTrapPm25: number,
  whoMultiple: number,
  cigsEq: number
): string {
  const q = prompt.toLowerCase();
  const severity = getAQISeverityMetadata(location.usAqi);

  const vulnerableNotes: string[] = [];
  if (profile.childrenCount > 0) {
    vulnerableNotes.push(
      `**Children (${profile.childrenCount}):** Kids breathe 2× more air per kg of body weight than adults. Keep morning school walks masked with pediatric KN95/FFP2, avoid playground runs during **${worstTrapWindow}**, and shift outdoor play to **${bestVentWindow}**.`
    );
  }
  if (profile.seniorsCount > 0) {
    vulnerableNotes.push(
      `**Seniors 65+ (${profile.seniorsCount}):** Fine winter PM2.5 enters the bloodstream and stresses the heart. Move morning walks from **${worstTrapWindow}** to **${bestVentWindow}** and keep bedroom filtration running overnight.`
    );
  }
  if (profile.respiratoryCareCount > 0) {
    vulnerableNotes.push(
      `**Asthma / Breathing Care (${profile.respiratoryCareCount}):** Cold dry air + traffic NO2 (${location.no2} µg/m³) can trigger wheezing. Keep indoor humidity around 45%, wear a snug N95 outdoors, and keep rescue inhalers handy.`
    );
  }
  if (profile.petsCount > 0) {
    vulnerableNotes.push(
      `**Pets (${profile.petsCount}):** Dogs and cats breathe close to the floor where soot settles. Keep walks short during **${bestVentWindow}**, wet-mop floors instead of dry sweeping, and wipe paws with a damp cloth after coming inside.`
    );
  }

  // Intent 1: DIY Filtration / Indoor Air Hacks / Purifiers
  if (
    q.includes('purifier') ||
    q.includes('corsi') ||
    q.includes('indoor') ||
    q.includes('filter') ||
    q.includes('expensive') ||
    q.includes('room') ||
    q.includes('hack')
  ) {
    return [
      `### Indoor Air Quality & DIY Filtration Blueprint for ${profile.familyName} (${location.city})`,
      `Tailored for **${memberSummary}** in your **${profile.mainRoomAreaSqM} m²** living area. Right now, outside PM2.5 in **${location.city}** is **${location.pm25} µg/m³** (**${whoMultiple}×** safe limit). Without hacks, drafts and ${profile.cookingType.replace(/_/g, ' ')} leave indoor air near **${iaqSim.baselineIndoorPm25} µg/m³**.`,
      '',
      `#### 1. Right-Sized Filtration (${profile.mainRoomAreaSqM} m² × ${profile.ceilingHeightM} m = ${cadrSizing.roomVolumeCubicM} m³)`,
      `- **Target Clean Air Delivery (5 ACH):** **${cadrSizing.requiredCadrCubicMPerHour} m³/h** (${cadrSizing.requiredCadrCfm} CFM).`,
      `- **Budget DIY Option (~$${cadrSizing.corsiEstimatedCostUsd}):** Build **${cadrSizing.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal Box** (4× MERV-13 filters + 20" box fan). It cleans ~600 m³/h and drops indoor PM2.5 to **~${cadrSizing.projectedIndoorPm25WithCorsi} µg/m³** (saving **$${Math.max(0, cadrSizing.commercialEstimatedCostUsd - cadrSizing.corsiEstimatedCostUsd)}** vs commercial HEPA).`,
      '',
      '#### 2. Three Free Indoor Hacks Today',
      `- **Open Windows Only During ${bestVentWindow}:** Outside air drops to **~${bestVentPm25} µg/m³** (vs **${worstTrapPm25} µg/m³** at ${worstTrapWindow}). Flush stale air for 15 minutes, then close tight.`,
      '- **Wet-Mop Only (No Dry Broom):** Dry sweeping kicks settled floor soot back into the air where kids and pets breathe.',
      '- **Cook on Rear Burners + Exhaust Fan:** Captures up to 80% of kitchen smoke and NO₂ before it spreads to bedrooms.',
      '',
      `> **Direct Impact Explained:** Your active indoor hacks cut home PM2.5 from **${iaqSim.baselineIndoorPm25} → ${iaqSim.optimizedIndoorPm25} µg/m³ (-${iaqSim.reductionPct}%)**, saving each of your **${profile.householdSize} family members** the equivalent of **${iaqSim.indoorCigarettesAvoidedPerDay} passive cigarettes/day**.`,
    ].join('\n');
  }

  // Intent 2: Specific Family Member Care (Kids / Seniors / Asthma / Pets / Masks)
  if (
    q.includes('kid') ||
    q.includes('child') ||
    q.includes('baby') ||
    q.includes('senior') ||
    q.includes('elder') ||
    q.includes('asthma') ||
    q.includes('pet') ||
    q.includes('dog') ||
    q.includes('mask') ||
    q.includes('n95')
  ) {
    return [
      `### Family Protection Guide for ${profile.familyName} (${memberSummary})`,
      `In **${location.city}** right now, AQI is **${location.usAqi} (${severity.tier})** with PM2.5 at **${location.pm25} µg/m³** (≈ **${cigsEq} cigarettes/day** outdoors).`,
      '',
      '#### Member-by-Member Safeguards',
      ...(vulnerableNotes.length > 0
        ? vulnerableNotes.map((n) => `- ${n}`)
        : [
            `- **Adults (${profile.adultsCount}):** Wear a fitted N95/FFP2 respirator during commutes and move outdoor workouts to **${bestVentWindow}** when outdoor dust drops to ~${bestVentPm25} µg/m³.`,
          ]),
      '',
      '#### Mask & Outdoor Checklist',
      '- **Choose N95 / KN95 / FFP2** (cloth and surgical masks do not block fine PM2.5 soot). Pinch the nose bridge firmly so air passes through the filter, not around the edges.',
      `- **Keep bedroom air clean overnight:** With your current indoor setup (**${iaqSim.optimizedIndoorPm25} µg/m³**), all **${profile.householdSize} family members** get 8+ hours of lung recovery every night.`,
      '',
      `> **Direct Impact Explained:** Following these steps keeps **${impactSummary.dailyPersonalDoseSavedUg} µg/day** of soot out of each person’s lungs — totaling **${impactSummary.familyWinterDoseSavedMg} mg** prevented across your **${profile.householdSize}-member household** this winter.`,
    ].join('\n');
  }

  // Intent 3: Community Pledge / School Carpool / Neighborhood Group Message
  if (
    q.includes('pledge') ||
    q.includes('community') ||
    q.includes('neighbor') ||
    q.includes('school') ||
    q.includes('whatsapp') ||
    q.includes('draft')
  ) {
    return [
      `### Ready-to-Share Neighborhood & School Clean-Air Message (${location.city})`,
      'Copy and paste this into your school parents’ group, apartment group, or HOA/RWA chat:',
      '',
      '---',
      `🌱 **Winter Smog Alert & Clean-Air Pact — ${location.city}**`,
      `Today our local AQI is **${location.usAqi} (${severity.tier})** with PM2.5 at **${location.pm25} µg/m³** (**${whoMultiple}×** safe limit, equal to **${cigsEq} cigarettes/day** of passive smoke).`,
      '',
      '**4 Simple Steps Our Neighborhood Can Take Today:**',
      '1. 🚗 **No Idling at School Gates & Driveways:** Turn off engines if parked >30 seconds. Cold-start idling emits 2.6× more toxic fumes right at children’s breathing height.',
      `2. 🕒 **Move Outdoor Play & Walks to ${bestVentWindow}:** Avoid outdoor exercise during **${worstTrapWindow}** (~${worstTrapPm25} µg/m³). Afternoon sun clears air down to ~${bestVentPm25} µg/m³.`,
      '3. 🍂 **Zero Open Leaf/Trash Burning:** Pool funds to give night guards electric heaters instead of open wood/leaf fires.',
      '4. 🤝 **3-Family Carpool Pods:** Sharing morning runs removes 2 out of 3 cold engines from our street.',
      '',
      `📊 **Collective Impact:** If 100 families join this winter, we stop **${impactSummary.communityWinterPmAndNoxSavedKg} kg** of street-level smog and **${impactSummary.communityWinterCo2SavedTons} tons of CO₂e** (equal to planting **${impactSummary.equivalentTreesCount.toLocaleString()} urban trees**)!`,
      '---',
    ].join('\n');
  }

  // Intent 4: Science of Commute / Heating / Cooking / Cause-and-Effect Impact
  if (
    q.includes('science') ||
    q.includes('impact') ||
    q.includes('commute') ||
    q.includes('heating') ||
    q.includes('cooking') ||
    q.includes('inversion') ||
    q.includes('why')
  ) {
    return [
      `### Direct Cause & Effect: How Your Daily Choices Affect ${location.city}’s Smog`,
      `In **${location.city}** (${location.temperatureC}°C, wind ${location.windSpeedKmh} km/h), cold ground air sits under warmer upper air (**Thermal Inversion**), trapping street smoke in a shallow **100–250 m lid**.`,
      '',
      '#### 1. Cold-Start Commuting & Errands',
      `- **Why it happens:** Cold engines take 5 km to warm up their catalytic converter—emitting **2.5×–3× more PM2.5 & NOₓ** during morning rush hour.`,
      `- **Your Family’s Impact (${profile.dailyCommuteKm} km/day):** Carpooling, transit, or batching short trips cuts **${impactSummary.householdDailyPmAndNoxSavedGrams} g/day** of street smog and **${impactSummary.householdDailyCo2SavedKg} kg CO₂e/day**.`,
      '',
      '#### 2. Home Heating & Kitchen Smoke',
      `- **Why it happens:** Unvented gas stoves and wood/coal stoves dump NO₂ and fine soot directly into closed winter rooms.`,
      `- **Your Family’s Impact (${profile.householdSize} people):** Rear-burner hood capture, draft sealing, and electric induction reduce indoor PM2.5 by **${iaqSim.reductionUgPerM3} µg/m³ (-${iaqSim.reductionPct}%)**.`,
      '',
      `> **Winter Season Total (${profile.familyName}):** Across 90 winter days, your **${profile.householdSize} family members** avoid **${impactSummary.familyWinterDoseSavedMg} mg** of inhaled soot.`,
    ].join('\n');
  }

  // Default / Comprehensive 24-Hour Family Plan tailored to exact members & custom prompt
  return [
    `### Personalized 24-Hour Smog Plan for ${profile.familyName}`,
    `**Household:** ${profile.householdSize} total (${memberSummary}) · **Location:** ${location.city} (**AQI ${location.usAqi}**, PM2.5 **${location.pm25} µg/m³**, **${whoMultiple}×** safe limit, ≈ **${cigsEq} cigarettes/day**).`,
    '',
    '#### Today’s Simple Schedule',
    `- **Morning Peak (${worstTrapWindow}, ~${worstTrapPm25} µg/m³):** Keep windows closed. Avoid morning runs or long walks. Use carpool/transit with car AC set to **Recirculate** and fitted N95 masks outdoors.`,
    `- **Best Window (${bestVentWindow}, ~${bestVentPm25} µg/m³):** Afternoon warmth drops smog by **~${Math.max(20, Math.round(((worstTrapPm25 - bestVentPm25) / Math.max(1, worstTrapPm25)) * 100))}%**. Open windows for a quick **15-minute fresh-air flush**, schedule outdoor walks/errands here, then close windows again.`,
    `- **Evening Cooking & Heating:** Cook on rear stove burners with the exhaust hood on (or use electric induction) so kitchen fumes don’t trap indoors.`,
    `- **Bedtime Sanctuary:** Run your purifier or **${cadrSizing.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal box** (${cadrSizing.requiredCadrCubicMPerHour} m³/h for your ${profile.mainRoomAreaSqM} m² room) to keep indoor air near **${iaqSim.optimizedIndoorPm25} µg/m³**.`,
    '',
    ...(vulnerableNotes.length > 0
      ? ['#### Specific Care for Your Family Members', ...vulnerableNotes.map((n) => `- ${n}`), '']
      : []),
    `> **Direct Impact Explained:** Following this routine protects all **${profile.householdSize} members** from **${impactSummary.dailyPersonalDoseSavedUg} µg/person/day** of soot (**${impactSummary.familyWinterDoseSavedMg} mg** over winter) and cuts **${impactSummary.householdDailyCo2SavedKg} kg CO₂e/day**.`,
  ].join('\n');
}
