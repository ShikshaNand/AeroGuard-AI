/**
 * Safe, Schema-Validated Local Persistence Layer
 * Persists user preferences (family member counts, home settings, chosen city,
 * adopted routines, indoor hacks, sustainable swaps, and accessibility mode)
 * across page reloads while safely rejecting corrupted or tampered storage data.
 *
 * SECURITY NOTE: API keys are intentionally NEVER persisted here.
 */

import type { FamilyProfile, LocationAirQuality } from '../types';
import { DEFAULT_FAMILY_PROFILE, WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import { sanitizeTextInput } from './security';

export const STORAGE_KEY = 'aeroguard_user_state_v1';

export type PersistedTabId = 'routines' | 'iaq-hacks' | 'sustainable-swaps' | 'ai-assistant';
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

const VALID_TABS = new Set<PersistedTabId>([
  'routines',
  'iaq-hacks',
  'sustainable-swaps',
  'ai-assistant',
]);

const VALID_COMMUTE = new Set<FamilyProfile['commuteMode']>([
  'car_solo_ice',
  'carpool_shared',
  'public_transit_metro',
  'electric_vehicle',
  'active_walk_cycle',
]);

const VALID_HEATING = new Set<FamilyProfile['heatingType']>([
  'wood_coal_biomass',
  'gas_furnace',
  'electric_resistance',
  'heat_pump_clean',
]);

const VALID_COOKING = new Set<FamilyProfile['cookingType']>([
  'lpg_gas_unvented',
  'gas_with_chimney_hood',
  'induction_electric',
]);

const VALID_SEALING = new Set<FamilyProfile['homeSealing']>([
  'leaky_drafty',
  'standard_masonry',
  'tight_weatherstripped',
]);

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
    commuteMode: VALID_COMMUTE.has(obj.commuteMode as FamilyProfile['commuteMode'])
      ? (obj.commuteMode as FamilyProfile['commuteMode'])
      : DEFAULT_FAMILY_PROFILE.commuteMode,
    dailyCommuteKm: clampInt(obj.dailyCommuteKm, 2, 60, DEFAULT_FAMILY_PROFILE.dailyCommuteKm),
    heatingType: VALID_HEATING.has(obj.heatingType as FamilyProfile['heatingType'])
      ? (obj.heatingType as FamilyProfile['heatingType'])
      : DEFAULT_FAMILY_PROFILE.heatingType,
    cookingType: VALID_COOKING.has(obj.cookingType as FamilyProfile['cookingType'])
      ? (obj.cookingType as FamilyProfile['cookingType'])
      : DEFAULT_FAMILY_PROFILE.cookingType,
    mainRoomAreaSqM: clampInt(obj.mainRoomAreaSqM, 10, 90, DEFAULT_FAMILY_PROFILE.mainRoomAreaSqM),
    ceilingHeightM:
      typeof obj.ceilingHeightM === 'number' &&
      obj.ceilingHeightM >= 2.2 &&
      obj.ceilingHeightM <= 5.0
        ? obj.ceilingHeightM
        : DEFAULT_FAMILY_PROFILE.ceilingHeightM,
    homeSealing: VALID_SEALING.has(obj.homeSealing as FamilyProfile['homeSealing'])
      ? (obj.homeSealing as FamilyProfile['homeSealing'])
      : DEFAULT_FAMILY_PROFILE.homeSealing,
    indoorRelativeHumidityPct: clampInt(
      obj.indoorRelativeHumidityPct,
      15,
      80,
      DEFAULT_FAMILY_PROFILE.indoorRelativeHumidityPct
    ),
  };
}

function validateLocation(raw: unknown): LocationAirQuality {
  if (!raw || typeof raw !== 'object') {
    return WINTER_SMOG_CITY_PRESETS[0];
  }
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.city === 'string' &&
    typeof obj.country === 'string' &&
    typeof obj.pm25 === 'number' &&
    typeof obj.usAqi === 'number' &&
    Array.isArray(obj.hourlyForecast) &&
    obj.hourlyForecast.length > 0
  ) {
    return {
      ...(obj as unknown as LocationAirQuality),
      city: sanitizeTextInput(obj.city, 60),
      country: sanitizeTextInput(obj.country, 60),
    };
  }
  return WINTER_SMOG_CITY_PRESETS[0];
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
      activeTab: VALID_TABS.has(parsed.activeTab as PersistedTabId)
        ? (parsed.activeTab as PersistedTabId)
        : defaults.activeTab,
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
