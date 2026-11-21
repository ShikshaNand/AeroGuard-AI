import { describe, it, expect } from 'vitest';
import {
  isCommuteMode,
  isCookingFuelType,
  isHeatingFuelType,
  isHomeSealingLevel,
  isPersistedTabId,
} from '../domain/profileGuards';

describe('profileGuards runtime enum validators', () => {
  it('accepts valid domain enum strings and rejects untrusted values', () => {
    expect(isCommuteMode('carpool_shared')).toBe(true);
    expect(isCommuteMode('helicopter')).toBe(false);

    expect(isHeatingFuelType('heat_pump_clean')).toBe(true);
    expect(isHeatingFuelType(123)).toBe(false);

    expect(isCookingFuelType('induction_electric')).toBe(true);
    expect(isCookingFuelType('campfire')).toBe(false);

    expect(isHomeSealingLevel('tight_weatherstripped')).toBe(true);
    expect(isHomeSealingLevel(null)).toBe(false);

    expect(isPersistedTabId('ai-assistant')).toBe(true);
    expect(isPersistedTabId('admin')).toBe(false);
  });
});
