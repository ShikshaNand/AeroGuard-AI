/**
 * Safe, Schema-Validated Local Persistence Layer
 * Persists user preferences (family member counts, home settings, chosen city,
 * adopted routines, indoor hacks, sustainable swaps, and accessibility mode)
 * across page reloads while safely rejecting corrupted or tampered storage data.
 *
 * SECURITY NOTE: API keys are intentionally NEVER persisted here.
 */

import type { FamilyProfile, HourlyPollutantPoint, LocationAirQuality } from '../types';
import { DEFAULT_FAMILY_PROFILE, WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import {
  isCommuteMode,
  isCookingFuelType,
  isHeatingFuelType,
  isHomeSealingLevel,
  isPersistedTabId,
  type PersistedTabId,
} from '../domain/profileGuards';
import { sanitizeTextInput, validateCoordinates } from './security';

export type { PersistedTabId };
export const STORAGE_KEY = 'aeroguard_user_state_v1';

export type ThemeMode = 'light' | 'dark';

export interface PersistedAppState {
  profile: FamilyProfile;
  location: LocationAirQuality;
  adoptedRoutineIds: string[];
  activeHackIds: string[];
  selectedSwapIds: string[];
  targetAch: number;
  communityHouseholdsCount: number;
  theme: ThemeMode;
  activeTab: PersistedTabId;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function validateStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value
    .filter((item): item is string => typeof item === 'string' && item.length <= 64)
    .slice(0, 30);
}

function validateProfile(raw: unknown): FamilyProfile {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_FAMILY_PROFILE;
  }
  const obj = raw as Record<string, unknown>;

  const adultsCount = clampInt(obj.adultsCount, 0, 10, DEFAULT_FAMILY_PROFILE.adultsCount);
  const childrenCount = clampInt(obj.childrenCount, 0, 10, DEFAULT_FAMILY_PROFILE.childrenCount);
  const seniorsCount = clampInt(obj.seniorsCount, 0, 10, DEFAULT_FAMILY_PROFILE.seniorsCount);
  const respiratoryCareCount = clampInt(
    obj.respiratoryCareCount,
    0,
    10,
    DEFAULT_FAMILY_PROFILE.respiratoryCareCount
  );
  const petsCount = clampInt(obj.petsCount, 0, 10, DEFAULT_FAMILY_PROFILE.petsCount);
  const householdSize = Math.max(1, adultsCount + childrenCount + seniorsCount);

  const rawName = typeof obj.familyName === 'string' ? sanitizeTextInput(obj.familyName, 40) : '';

  return {
    familyName: rawName || DEFAULT_FAMILY_PROFILE.familyName,
    householdSize,
    adultsCount,
    childrenCount,
    seniorsCount,
    respiratoryCareCount,
    petsCount,
    hasInfantsOrChildren: childrenCount > 0,
    hasElderlyMembers: seniorsCount > 0,
    hasAsthmaOrRespiratory: respiratoryCareCount > 0,
    hasPregnantMember: Boolean(obj.hasPregnantMember),
    hasPets: petsCount > 0,
    commuteMode: isCommuteMode(obj.commuteMode)
      ? obj.commuteMode
      : DEFAULT_FAMILY_PROFILE.commuteMode,
    dailyCommuteKm: clampInt(obj.dailyCommuteKm, 2, 60, DEFAULT_FAMILY_PROFILE.dailyCommuteKm),
    heatingType: isHeatingFuelType(obj.heatingType)
      ? obj.heatingType
      : DEFAULT_FAMILY_PROFILE.heatingType,
    cookingType: isCookingFuelType(obj.cookingType)
      ? obj.cookingType
      : DEFAULT_FAMILY_PROFILE.cookingType,
    mainRoomAreaSqM: clampInt(obj.mainRoomAreaSqM, 10, 90, DEFAULT_FAMILY_PROFILE.mainRoomAreaSqM),
    ceilingHeightM:
      typeof obj.ceilingHeightM === 'number' &&
      obj.ceilingHeightM >= 2.2 &&
      obj.ceilingHeightM <= 5.0
        ? obj.ceilingHeightM
        : DEFAULT_FAMILY_PROFILE.ceilingHeightM,
    homeSealing: isHomeSealingLevel(obj.homeSealing)
      ? obj.homeSealing
      : DEFAULT_FAMILY_PROFILE.homeSealing,
    indoorRelativeHumidityPct: clampInt(
      obj.indoorRelativeHumidityPct,
      15,
      80,
      DEFAULT_FAMILY_PROFILE.indoorRelativeHumidityPct
    ),
  };
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Number(value.toFixed(1))));
}

function validateHourlyPoint(raw: unknown, idx: number): HourlyPollutantPoint | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const p = raw as Record<string, unknown>;
  const hourIndex = clampInt(p.hourIndex, 0, 23, idx % 24);
  const pm25 = clampInt(p.pm25, 0, 1500, 50);
  const pm10 = clampInt(p.pm10, pm25, 2500, Math.round(pm25 * 1.4));
  return {
    hourLabel: `${String(hourIndex).padStart(2, '0')}:00`,
    hourIndex,
    pm25,
    pm10,
    no2: clampInt(p.no2, 0, 1000, 35),
    windSpeedKmh: clampFloat(p.windSpeedKmh, 0, 150, 5),
    tempC: clampFloat(p.tempC, -50, 60, 10),
    usAqi: clampInt(p.usAqi, 0, 500, 120),
    isSafeVentilationWindow: Boolean(p.isSafeVentilationWindow),
    isInversionTrap: Boolean(p.isInversionTrap),
  };
}

function validateLocation(raw: unknown): LocationAirQuality {
  const fallback = WINTER_SMOG_CITY_PRESETS[0];
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  const city = typeof obj.city === 'string' ? sanitizeTextInput(obj.city, 60) : '';
  const country = typeof obj.country === 'string' ? sanitizeTextInput(obj.country, 60) : '';
  if (!city || !country || !Array.isArray(obj.hourlyForecast) || obj.hourlyForecast.length === 0) {
    return fallback;
  }

  const hourlyForecast = obj.hourlyForecast
    .slice(0, 24)
    .map((item, idx) => validateHourlyPoint(item, idx))
    .filter((item): item is HourlyPollutantPoint => item !== null);

  if (hourlyForecast.length === 0) {
    return fallback;
  }

  const coords = validateCoordinates(
    typeof obj.latitude === 'number' ? obj.latitude : fallback.latitude,
    typeof obj.longitude === 'number' ? obj.longitude : fallback.longitude
  );
  const pm25 = clampInt(obj.pm25, 0, 1500, fallback.pm25);

  return {
    id:
      typeof obj.id === 'string' && obj.id.length <= 64
        ? sanitizeTextInput(obj.id, 64) || fallback.id
        : fallback.id,
    city,
    country,
    latitude: coords.latitude,
    longitude: coords.longitude,
    isLiveApi: Boolean(obj.isLiveApi),
    updatedAt:
      typeof obj.updatedAt === 'string'
        ? sanitizeTextInput(obj.updatedAt, 60) || fallback.updatedAt
        : fallback.updatedAt,
    pm25,
    pm10: clampInt(obj.pm10, pm25, 2500, Math.round(pm25 * 1.4)),
    no2: clampInt(obj.no2, 0, 1000, fallback.no2),
    o3: clampInt(obj.o3, 0, 1000, fallback.o3),
    so2: clampInt(obj.so2, 0, 1000, fallback.so2),
    co: clampInt(obj.co, 0, 50000, fallback.co),
    usAqi: clampInt(obj.usAqi, 0, 500, fallback.usAqi),
    temperatureC: clampFloat(obj.temperatureC, -50, 60, fallback.temperatureC),
    humidityPct: clampInt(obj.humidityPct, 0, 100, fallback.humidityPct),
    windSpeedKmh: clampFloat(obj.windSpeedKmh, 0, 150, fallback.windSpeedKmh),
    dominantSmogSource:
      typeof obj.dominantSmogSource === 'string'
        ? sanitizeTextInput(obj.dominantSmogSource, 220) || fallback.dominantSmogSource
        : fallback.dominantSmogSource,
    hourlyForecast,
  };
}

export function getDefaultPersistedState(): PersistedAppState {
  return {
    profile: DEFAULT_FAMILY_PROFILE,
    location: WINTER_SMOG_CITY_PRESETS[0],
    adoptedRoutineIds: [
      'routine-morning-commute',
      'routine-exercise-walk',
      'routine-pulse-ventilation',
      'routine-evening-cooking',
    ],
    activeHackIds: [
      'hack-corsi-rosenthal',
      'hack-bedroom-sanctuary',
      'hack-wet-mop-microfiber',
      'hack-back-burner-exhaust',
    ],
    selectedSwapIds: [
      'swap-school-carpool-transit',
      'swap-induction-pressure-cooking',
      'swap-zero-waste-leaf-compost',
      'swap-anti-idling-school-zone',
    ],
    targetAch: 5,
    communityHouseholdsCount: 100,
    theme: 'light',
    activeTab: 'routines',
  };
}

/**
 * Loads and validates saved user state from localStorage, falling back cleanly to defaults.
 */
export function loadPersistedState(): PersistedAppState {
  const defaults = getDefaultPersistedState();
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaults;
    }
    const rawJson = window.localStorage.getItem(STORAGE_KEY);
    if (!rawJson) {
      return defaults;
    }
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return defaults;
    }

    return {
      profile: validateProfile(parsed.profile),
      location: validateLocation(parsed.location),
      adoptedRoutineIds: validateStringArray(parsed.adoptedRoutineIds, defaults.adoptedRoutineIds),
      activeHackIds: validateStringArray(parsed.activeHackIds, defaults.activeHackIds),
      selectedSwapIds: validateStringArray(parsed.selectedSwapIds, defaults.selectedSwapIds),
      targetAch: clampInt(parsed.targetAch, 3, 8, defaults.targetAch),
      communityHouseholdsCount: clampInt(
        parsed.communityHouseholdsCount,
        10,
        1000,
        defaults.communityHouseholdsCount
      ),
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      activeTab: isPersistedTabId(parsed.activeTab) ? parsed.activeTab : defaults.activeTab,
    };
  } catch {
    return defaults;
  }
}

/**
 * Saves non-sensitive user preferences to localStorage safely.
 */
export function savePersistedState(state: PersistedAppState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private-mode security errors gracefully
  }
}

/**
 * Clears saved preferences from localStorage.
 */
export function clearPersistedState(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors gracefully
  }
}
