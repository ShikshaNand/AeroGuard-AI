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

  it('calibrates cold-start multipliers by ambient temperature and adapts tags to household profile', () => {
    const subZeroCity = { ...WINTER_SMOG_CITY_PRESETS[2], temperatureC: -8 };
    const mildCity = { ...WINTER_SMOG_CITY_PRESETS[0], temperatureC: 14 };

    const seniorProfile = {
      ...DEFAULT_FAMILY_PROFILE,
      hasInfantsOrChildren: false,
      hasElderlyMembers: true,
      hasAsthmaOrRespiratory: false,
      hasPets: true,
      commuteMode: 'electric_vehicle' as const,
      cookingType: 'induction_electric' as const,
    };

    const asthmaProfile = {
      ...seniorProfile,
      hasElderlyMembers: false,
      hasAsthmaOrRespiratory: true,
      hasPets: false,
      commuteMode: 'car_solo_ice' as const,
    };

    const adultOnlyProfile = {
      ...asthmaProfile,
      hasAsthmaOrRespiratory: false,
    };

    const subZeroIceRoutines = generateTailoredDailyRoutines(
      subZeroCity,
      asthmaProfile,
      new Set()
    );
    const mildIceRoutines = generateTailoredDailyRoutines(mildCity, adultOnlyProfile, new Set());
    const evSeniorRoutines = generateTailoredDailyRoutines(subZeroCity, seniorProfile, new Set());

    // Sub-zero cold-start multiplier (1.4x) produces higher tailpipe savings than mild (>10C, 1.0x)
    expect(subZeroIceRoutines[0].localPollutantsSavedGrams).toBeGreaterThan(
      mildIceRoutines[0].localPollutantsSavedGrams
    );
    expect(subZeroIceRoutines[4].localPollutantsSavedGrams).toBeGreaterThan(
      mildIceRoutines[4].localPollutantsSavedGrams
    );

    // EV commute yields lower car tailpipe savings than solo ICE
    expect(evSeniorRoutines[0].co2eSavedKg).toBeLessThan(subZeroIceRoutines[0].co2eSavedKg);
    // Senior + pets + electric induction branches
    expect(evSeniorRoutines[0].tailoredForGroup).toContain('65+');
    expect(evSeniorRoutines[1].title).toContain('Dog Walk');
    expect(evSeniorRoutines[3].personalPm25DoseSavedUg).toBe(48);
    // Asthma and whole-household branches
    expect(subZeroIceRoutines[0].tailoredForGroup).toContain('Asthma');
    expect(subZeroIceRoutines[1].tailoredForGroup).toContain('Asthma');
    expect(mildIceRoutines[0].tailoredForGroup).toContain('Whole-Household');
  });
});
