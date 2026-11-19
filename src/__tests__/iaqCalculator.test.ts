import { describe, it, expect } from 'vitest';
import {
  simulateIndoorAirQuality,
  calculateCadrAndCorsiSizing,
} from '../domain/iaqCalculator';
import {
  DEFAULT_FAMILY_PROFILE,
  IAQ_HACKS_CATALOGUE,
} from '../data/smogPresets';

describe('iaqCalculator domain functions', () => {
  it('reduces indoor PM2.5 significantly when DIY filtration and source control hacks are active', () => {
    const noHacksSim = simulateIndoorAirQuality(220, DEFAULT_FAMILY_PROFILE, []);
    const fullHacksSim = simulateIndoorAirQuality(
      220,
      DEFAULT_FAMILY_PROFILE,
      IAQ_HACKS_CATALOGUE.slice(0, 4)
    );

    expect(noHacksSim.baselineIndoorPm25).toBeGreaterThan(150);
    expect(fullHacksSim.optimizedIndoorPm25).toBeLessThan(noHacksSim.baselineIndoorPm25);
    expect(fullHacksSim.reductionPct).toBeGreaterThanOrEqual(70);
    expect(fullHacksSim.indoorCigarettesAvoidedPerDay).toBeGreaterThan(3);
  });

  it('penalizes solid-fuel biomass heating and unvented gas cooking in baseline indoor PM2.5', () => {
    const cleanProfile = {
      ...DEFAULT_FAMILY_PROFILE,
      heatingType: 'heat_pump_clean' as const,
      cookingType: 'induction_electric' as const,
      homeSealing: 'tight_weatherstripped' as const,
    };

    const smokyProfile = {
      ...DEFAULT_FAMILY_PROFILE,
      heatingType: 'wood_coal_biomass' as const,
      cookingType: 'lpg_gas_unvented' as const,
      homeSealing: 'leaky_drafty' as const,
    };

    const cleanRes = simulateIndoorAirQuality(120, cleanProfile, []);
    const smokyRes = simulateIndoorAirQuality(120, smokyProfile, []);

    expect(smokyRes.indoorCombustionContributionUg).toBeGreaterThan(
      cleanRes.indoorCombustionContributionUg
    );
    expect(smokyRes.baselineIndoorPm25).toBeGreaterThan(cleanRes.baselineIndoorPm25 + 60);
  });

  it('calculates required CADR and compares DIY Corsi-Rosenthal boxes against commercial HEPA units', () => {
    const sizing = calculateCadrAndCorsiSizing(30, 3.0, 200, 5);

    expect(sizing.roomVolumeCubicM).toBe(90);
    expect(sizing.requiredCadrCubicMPerHour).toBe(450);
    expect(sizing.corsiRosenthalBoxesNeeded).toBe(1);
    expect(sizing.commercialHepaUnitsNeeded).toBe(2);
    expect(sizing.corsiEstimatedCostUsd).toBeLessThan(sizing.commercialEstimatedCostUsd);
    expect(sizing.projectedIndoorPm25WithCorsi).toBeLessThan(
      sizing.projectedIndoorPm25Unfiltered
    );
  });
});
