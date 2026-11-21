/**
 * Runtime Type Guards for Family Profile Enums & Navigation Tabs
 * Single source of truth used by both form controls and localStorage schema validation,
 * eliminating unsafe `as` type assertions across components and persistence layers.
 */

import type {
  CommuteMode,
  CookingFuelType,
  HeatingFuelType,
  HomeSealingLevel,
} from '../types';

export type PersistedTabId = 'routines' | 'iaq-hacks' | 'sustainable-swaps' | 'ai-assistant';

const VALID_TABS: ReadonlySet<PersistedTabId> = new Set([
  'routines',
  'iaq-hacks',
  'sustainable-swaps',
  'ai-assistant',
]);

const VALID_COMMUTE: ReadonlySet<CommuteMode> = new Set([
  'car_solo_ice',
  'carpool_shared',
  'public_transit_metro',
  'electric_vehicle',
  'active_walk_cycle',
]);

const VALID_HEATING: ReadonlySet<HeatingFuelType> = new Set([
  'wood_coal_biomass',
  'gas_furnace',
  'electric_resistance',
  'heat_pump_clean',
]);

const VALID_COOKING: ReadonlySet<CookingFuelType> = new Set([
  'lpg_gas_unvented',
  'gas_with_chimney_hood',
  'induction_electric',
]);

const VALID_SEALING: ReadonlySet<HomeSealingLevel> = new Set([
  'leaky_drafty',
  'standard_masonry',
  'tight_weatherstripped',
]);

function isInSet<T extends string>(set: ReadonlySet<T>, value: unknown): value is T {
  return typeof value === 'string' && set.has(value as T);
}

export function isPersistedTabId(value: unknown): value is PersistedTabId {
  return isInSet(VALID_TABS, value);
}

export function isCommuteMode(value: unknown): value is CommuteMode {
  return isInSet(VALID_COMMUTE, value);
}

export function isHeatingFuelType(value: unknown): value is HeatingFuelType {
  return isInSet(VALID_HEATING, value);
}

export function isCookingFuelType(value: unknown): value is CookingFuelType {
  return isInSet(VALID_COOKING, value);
}

export function isHomeSealingLevel(value: unknown): value is HomeSealingLevel {
  return isInSet(VALID_SEALING, value);
}
