import { describe, it, expect } from 'vitest';
import {
  pm25ToUsAqi,
  getAQISeverityMetadata,
  calculateWhoMultiple,
  calculateCigaretteEquivalent,
  determineInversionRisk,
  findOptimalVentilationWindows,
} from '../domain/airQualityEngine';
import { buildHourlyWinterCurve } from '../data/smogPresets';

describe('airQualityEngine domain functions', () => {
  it('accurately converts PM2.5 concentrations across EPA AQI breakpoints', () => {
    expect(pm25ToUsAqi(0)).toBe(0);
    expect(pm25ToUsAqi(9.0)).toBe(50);
    expect(pm25ToUsAqi(35.4)).toBe(100);
    expect(pm25ToUsAqi(55.4)).toBe(150);
    expect(pm25ToUsAqi(125.4)).toBe(200);
    expect(pm25ToUsAqi(225.4)).toBe(300);
    expect(pm25ToUsAqi(400)).toBe(500);
  });

  it('returns accessible non-color-dependent symbols and severity metadata for all AQI tiers', () => {
    expect(getAQISeverityMetadata(35).symbolCode).toBe('✓ GOOD');
    expect(getAQISeverityMetadata(80).symbolCode).toBe('◐ MOD');
    expect(getAQISeverityMetadata(125).symbolCode).toBe('▲ USG');
    expect(getAQISeverityMetadata(175).symbolCode).toBe('◆ UNHEALTHY');
    expect(getAQISeverityMetadata(260).symbolCode).toBe('✖ VERY UNHEALTHY');
    expect(getAQISeverityMetadata(350).symbolCode).toBe('☣ HAZARDOUS');
  });

  it('computes WHO 2021 guideline multiples (15 µg/m³) and Berkeley Earth cigarette equivalents (22 µg/m³)', () => {
    expect(calculateWhoMultiple(15)).toBe(1.0);
    expect(calculateWhoMultiple(150)).toBe(10.0);
    expect(calculateCigaretteEquivalent(22)).toBe(1.0);
    expect(calculateCigaretteEquivalent(220)).toBe(10.0);
  });

  it('identifies winter thermal inversion risk based on cold temperatures and calm winds', () => {
    expect(determineInversionRisk(6, 4.0, 210)).toBe('Extreme Winter Inversion');
    expect(determineInversionRisk(8, 5.5, 90)).toBe('High (Thermal Trap)');
    expect(determineInversionRisk(18, 16, 12)).toBe('Low');
  });

  it('identifies the mid-afternoon solar mixing window as the safest natural ventilation period', () => {
    const curve = buildHourlyWinterCurve(200, 310, 70, 9.5, 4.5);
    const analysis = findOptimalVentilationWindows(curve);

    expect(analysis.bestWindowAvgPm25).toBeLessThan(analysis.worstTrapAvgPm25);
    expect(analysis.pm25ReductionPctByTiming).toBeGreaterThanOrEqual(45);
    expect(analysis.bestWindowLabel).toBe('14:00 – 16:00');
  });
});
