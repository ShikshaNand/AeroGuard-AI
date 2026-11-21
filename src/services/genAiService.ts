/**
 * Hybrid GenAI Smog & Sustainability Advisor Service
 * Orchestrates input guardrails, sliding-window rate limiting, bounded TTL caching,
 * live Google Gemini generation (via Vercel /api/gemini proxy or client key),
 * and seamless fallback to the deterministic Environmental Science Engine.
 */

import type { CADRSizingResult, FamilyProfile, LocationAirQuality } from '../types';
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
import { SlidingWindowRateLimiter, validatePromptSafety } from '../utils/security';
import { executeLiveGeminiRequest, hasClientGeminiKey } from './geminiApiClient';
import type { GroundedPromptContext } from './geminiProtocol';

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

function buildProfileFingerprint(profile: FamilyProfile, optimizedIndoorPm25: number): string {
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

function toGroundedPromptContext(ctx: ExpertAdviceContext): GroundedPromptContext {
  return {
    city: ctx.location.city,
    country: ctx.location.country,
    usAqi: ctx.location.usAqi,
    pm25: ctx.location.pm25,
    pm10: ctx.location.pm10,
    no2: ctx.location.no2,
    temperatureC: ctx.location.temperatureC,
    windSpeedKmh: ctx.location.windSpeedKmh,
    whoMultiple: ctx.whoMultiple,
    cigsEq: ctx.cigsEq,
    bestVentWindow: ctx.bestVentWindow,
    familyName: ctx.profile.familyName,
    householdSize: ctx.profile.householdSize,
    memberSummary: ctx.memberSummary,
    commuteMode: ctx.profile.commuteMode,
    dailyCommuteKm: ctx.profile.dailyCommuteKm,
    heatingType: ctx.profile.heatingType,
    cookingType: ctx.profile.cookingType,
    mainRoomAreaSqM: ctx.profile.mainRoomAreaSqM,
    roomVolumeCubicM: ctx.cadrSizing.roomVolumeCubicM,
    baselineIndoorPm25: ctx.iaqSim.baselineIndoorPm25,
    optimizedIndoorPm25: ctx.iaqSim.optimizedIndoorPm25,
    reductionPct: ctx.iaqSim.reductionPct,
    targetAch: ctx.cadrSizing.targetAirChangesPerHour,
    requiredCadrCubicMPerHour: ctx.cadrSizing.requiredCadrCubicMPerHour,
    corsiRosenthalBoxesNeeded: ctx.cadrSizing.corsiRosenthalBoxesNeeded,
    dailyPersonalDoseSavedUg: ctx.impactSummary.dailyPersonalDoseSavedUg,
    familyWinterDoseSavedMg: ctx.impactSummary.familyWinterDoseSavedMg,
    householdDailyCo2SavedKg: ctx.impactSummary.householdDailyCo2SavedKg,
    householdDailyPmAndNoxSavedGrams: ctx.impactSummary.householdDailyPmAndNoxSavedGrams,
  };
}

/**
 * Generates a tailored, context-grounded response for the user's question.
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

  const modePrefix = hasClientGeminiKey(sessionApiKey) ? 'live' : 'auto';
  const profileFingerprint = buildProfileFingerprint(profile, iaqSim.optimizedIndoorPm25);
  const cacheKey = `${modePrefix}:${location.id}:${location.pm25}:${profileFingerprint}:${prompt.toLowerCase()}`;

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

  const liveOutcome = await executeLiveGeminiRequest(
    prompt,
    toGroundedPromptContext(adviceContext),
    sessionApiKey
  );

  if (liveOutcome.ok && liveOutcome.text) {
    const liveResult: GenAIResponsePayload = {
      content: liveOutcome.text,
      sourceMode: 'gemini-live',
      modelUsed: liveOutcome.modelUsed,
      keyMetricsCited,
    };
    responseCache.set(cacheKey, liveResult);
    return liveResult;
  }

  const fallbackResult: GenAIResponsePayload = {
    content: synthesizeExpertScienceResponse(prompt, adviceContext),
    sourceMode: 'expert-engine',
    keyMetricsCited,
    fallbackNotice: liveOutcome.fallbackNotice,
  };
  if (!liveOutcome.fallbackNotice) {
    responseCache.set(cacheKey, fallbackResult);
  }
  return fallbackResult;
}
