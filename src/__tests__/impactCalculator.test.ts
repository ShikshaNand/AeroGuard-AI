import { describe, it, expect } from 'vitest';
import {
  generateTailoredDailyRoutines,
  calculateAggregateImpact,
} from '../domain/impactCalculator';
import {
  DEFAULT_FAMILY_PROFILE,
  SUSTAINABLE_ALTERNATIVES_CATALOGUE,
  WINTER_SMOG_CITY_PRESETS,
} from '../data/smogPresets';

describe('impactCalculator domain functions', () => {
  it('generates 5 tailored daily routines with direct cause-and-effect explanations', () => {
    const adoptedIds = new Set(['routine-morning-commute', 'routine-exercise-walk']);
    const routines = generateTailoredDailyRoutines(
      WINTER_SMOG_CITY_PRESETS[0],
      DEFAULT_FAMILY_PROFILE,
      adoptedIds
    );

    expect(routines).toHaveLength(5);
    expect(routines[0].isAdopted).toBe(true);
    expect(routines[1].isAdopted).toBe(true);
    expect(routines[2].isAdopted).toBe(false);
    for (const r of routines) {
      expect(r.personalPm25DoseSavedUg).toBeGreaterThan(10);
      expect(r.directImpactExplanation.length).toBeGreaterThan(50);
    }
  });

  it('scales personal lung dose savings and community emission reductions across households', () => {
    const adoptedIds = new Set([
      'routine-morning-commute',
      'routine-exercise-walk',
      'routine-pulse-ventilation',
    ]);
    const routines = generateTailoredDailyRoutines(
      WINTER_SMOG_CITY_PRESETS[0],
      DEFAULT_FAMILY_PROFILE,
      adoptedIds
    );
    const swaps = SUSTAINABLE_ALTERNATIVES_CATALOGUE.slice(0, 3);

    const impact10 = calculateAggregateImpact(routines, swaps, 10, 4);
    const impact100 = calculateAggregateImpact(routines, swaps, 100, 4);

    expect(impact100.dailyPersonalDoseSavedUg).toBeGreaterThan(100);
    expect(impact100.communityWinterCo2SavedTons).toBeCloseTo(
      impact10.communityWinterCo2SavedTons * 10,
      0
    );
    expect(impact100.communityWinterPmAndNoxSavedKg).toBeGreaterThan(
      impact10.communityWinterPmAndNoxSavedKg
    );
    expect(impact100.equivalentTreesCount).toBeGreaterThan(100);
  });
});
