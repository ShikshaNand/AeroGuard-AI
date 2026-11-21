/**
 * Air Quality & Winter Thermal Inversion Domain Engine
 * Pure functions implementing EPA AQI breakpoint conversion, WHO 2021 guideline multiples,
 * Berkeley Earth passive cigarette equivalency, and winter inversion ventilation window optimization.
 */

import type {
  AQISeverityTier,
  HourlyPollutantPoint,
  InversionRiskLevel,
} from '../types';

/** WHO 2021 24-hour mean guideline for PM2.5 (µg/m³) */
export const WHO_24H_PM25_LIMIT = 15;

/** Berkeley Earth equivalency: 22 µg/m³ of 24-hour PM2.5 ≈ 1 cigarette per day */
export const BERKELEY_EARTH_CIGARETTE_PM25 = 22;

export interface AQISeverityMetadata {
  tier: AQISeverityTier;
  /** Accessible non-color symbol prefix for colorblind & screen-reader clarity */
  symbolCode: string;
  /** Semantic CSS class mapped to theme-aware AQI badge custom properties */
  badgeClasses: string;
  shortGuidance: string;
  sensitiveGroupWarning: string;
}

/**
 * Converts fine particulate concentration PM2.5 (µg/m³) to US EPA AQI (0–500).
 */
export function pm25ToUsAqi(pm25Input: number): number {
  const c = Math.max(0, Number.isFinite(pm25Input) ? pm25Input : 0);

  const breakpoints: Array<[number, number, number, number]> = [
    [0.0, 9.0, 0, 50],
    [9.0, 35.4, 51, 100],
    [35.4, 55.4, 101, 150],
    [55.4, 125.4, 151, 200],
    [125.4, 225.4, 201, 300],
    [225.4, 325.4, 301, 500],
  ];

  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      const aqi = ((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow;
      return Math.round(aqi);
    }
  }

  return 500;
}

/**
 * Maps a US AQI value to severity metadata, pairing colors with text symbols
 * and explicit guidance for WCAG 2.1 AA accessibility.
 */
export function getAQISeverityMetadata(usAqi: number): AQISeverityMetadata {
  const aqi = Math.max(0, Math.round(usAqi));

  if (aqi <= 50) {
    return {
      tier: 'Good',
      symbolCode: '✓ GOOD',
      badgeClasses: 'aqi-badge-good',
      shortGuidance: 'Ideal conditions for outdoor family activities and full home cross-ventilation.',
      sensitiveGroupWarning: 'Safe for infants, elderly, and asthma/COPD members.',
    };
  }

  if (aqi <= 100) {
    return {
      tier: 'Moderate',
      symbolCode: '◐ MOD',
      badgeClasses: 'aqi-badge-moderate',
      shortGuidance: 'Acceptable air quality; ventilate during afternoon breeze hours.',
      sensitiveGroupWarning:
        'Unusually sensitive children or asthma patients should reduce prolonged heavy exertion near busy roads.',
    };
  }

  if (aqi <= 150) {
    return {
      tier: 'Unhealthy for Sensitive Groups',
      symbolCode: '▲ USG',
      badgeClasses: 'aqi-badge-usg',
      shortGuidance: 'Winter smog accumulation detected. Shift heavy exercise indoors or to mid-afternoon.',
      sensitiveGroupWarning:
        'Children, elderly (65+), pregnant women, and asthma patients should wear N95/KN95 masks during morning commute.',
    };
  }

  if (aqi <= 200) {
    return {
      tier: 'Unhealthy',
      symbolCode: '◆ UNHEALTHY',
      badgeClasses: 'aqi-badge-unhealthy',
      shortGuidance:
        'Active winter smog trap. Keep windows sealed during morning/evening peaks and run indoor HEPA or DIY MERV-13 filtration.',
      sensitiveGroupWarning:
        'Everyone may experience airway irritation; children and elderly must avoid outdoor physical exertion.',
    };
  }

  if (aqi <= 300) {
    return {
      tier: 'Very Unhealthy',
      symbolCode: '✖ VERY UNHEALTHY',
      badgeClasses: 'aqi-badge-very-unhealthy',
      shortGuidance:
        'Severe winter thermal inversion trap. Cancel outdoor runs/sports, seal window drafts, and restrict ventilation to a 15-min afternoon pulse.',
      sensitiveGroupWarning:
        'High risk of acute respiratory inflammation for kids, elderly, and pets. Use well-fitted N95/FFP2 masks outdoors.',
    };
  }

  return {
    tier: 'Severe / Hazardous',
    symbolCode: '☣ HAZARDOUS',
    badgeClasses: 'aqi-badge-hazardous',
    shortGuidance:
      'Emergency winter smog crisis. Create a clean-air sanctuary room indoors, wet-mop floors, and eliminate all indoor combustion.',
    sensitiveGroupWarning:
      'CRITICAL ALERT: Keep children, elderly, and respiratory patients strictly indoors with active air filtration.',
  };
}

/**
 * Calculates how many times the current PM2.5 exceeds the WHO 24-hour safe guideline (15 µg/m³).
 */
export function calculateWhoMultiple(pm25: number): number {
  const safePm25 = Math.max(0, pm25);
  return Number((safePm25 / WHO_24H_PM25_LIMIT).toFixed(1));
}

/**
 * Converts 24-hour average or current PM2.5 (µg/m³) into equivalent passive cigarettes smoked per day.
 */
export function calculateCigaretteEquivalent(pm25: number): number {
  const safePm25 = Math.max(0, pm25);
  return Number((safePm25 / BERKELEY_EARTH_CIGARETTE_PM25).toFixed(1));
}

/**
 * Evaluates winter thermal inversion risk based on surface temperature, wind speed, and PM2.5 buildup.
 * In winter, cold dense surface air trapped beneath a warmer upper air layer with low wind (< 8 km/h)
 * acts like a lid over the city.
 */
export function determineInversionRisk(
  tempC: number,
  windSpeedKmh: number,
  pm25: number
): InversionRiskLevel {
  if (pm25 >= 150 && windSpeedKmh <= 7 && tempC <= 14) {
    return 'Extreme Winter Inversion';
  }
  if ((pm25 >= 75 && windSpeedKmh <= 10) || (tempC <= 10 && windSpeedKmh <= 6 && pm25 >= 45)) {
    return 'High (Thermal Trap)';
  }
  if (pm25 >= 35 || windSpeedKmh <= 12) {
    return 'Moderate';
  }
  return 'Low';
}

export interface VentilationWindowAnalysis {
  bestWindowLabel: string;
  bestWindowAvgPm25: number;
  bestHours: HourlyPollutantPoint[];
  worstTrapLabel: string;
  worstTrapAvgPm25: number;
  worstHours: HourlyPollutantPoint[];
  /** Percentage reduction in outdoor PM2.5 during the afternoon window vs. morning inversion peak */
  pm25ReductionPctByTiming: number;
}

/**
 * Analyzes a 24-hour hourly forecast to find the cleanest daytime window (between 11:00 and 17:00)
 * for brief indoor cross-ventilation or outdoor errands, comparing it against morning/evening inversion traps.
 */
export function findOptimalVentilationWindows(
  hourly: HourlyPollutantPoint[]
): VentilationWindowAnalysis {
  if (!hourly || hourly.length === 0) {
    return {
      bestWindowLabel: '14:00 – 16:00',
      bestWindowAvgPm25: 35,
      bestHours: [],
      worstTrapLabel: '07:00 – 09:00',
      worstTrapAvgPm25: 140,
      worstHours: [],
      pm25ReductionPctByTiming: 75,
    };
  }

  // Filter daytime hours (11:00 to 17:00) where solar mixing usually lifts the inversion ceiling
  const daytimeCandidates = hourly.filter((h) => h.hourIndex >= 11 && h.hourIndex <= 17);
  const pool = daytimeCandidates.length >= 2 ? daytimeCandidates : hourly;

  const sortedByCleanest = [...pool].sort((a, b) => a.pm25 - b.pm25);
  const bestHours = sortedByCleanest.slice(0, 2).sort((a, b) => a.hourIndex - b.hourIndex);

  const sortedByDirtiest = [...hourly].sort((a, b) => b.pm25 - a.pm25);
  const worstHours = sortedByDirtiest.slice(0, 2).sort((a, b) => a.hourIndex - b.hourIndex);

  const bestWindowAvgPm25 = Math.round(
    bestHours.reduce((acc, h) => acc + h.pm25, 0) / Math.max(1, bestHours.length)
  );
  const worstTrapAvgPm25 = Math.round(
    worstHours.reduce((acc, h) => acc + h.pm25, 0) / Math.max(1, worstHours.length)
  );

  const firstBest = bestHours[0]?.hourLabel ?? '14:00';
  const lastBestHourIdx = (bestHours[bestHours.length - 1]?.hourIndex ?? 15) + 1;
  const lastBest = `${String(lastBestHourIdx % 24).padStart(2, '0')}:00`;

  const firstWorst = worstHours[0]?.hourLabel ?? '07:00';
  const lastWorstHourIdx = (worstHours[worstHours.length - 1]?.hourIndex ?? 8) + 1;
  const lastWorst = `${String(lastWorstHourIdx % 24).padStart(2, '0')}:00`;

  const pm25ReductionPctByTiming =
    worstTrapAvgPm25 > 0
      ? Math.max(
          0,
          Math.min(95, Math.round(((worstTrapAvgPm25 - bestWindowAvgPm25) / worstTrapAvgPm25) * 100))
        )
      : 0;

  return {
    bestWindowLabel: `${firstBest} – ${lastBest}`,
    bestWindowAvgPm25,
    bestHours,
    worstTrapLabel: `${firstWorst} – ${lastWorst}`,
    worstTrapAvgPm25,
    worstHours,
    pm25ReductionPctByTiming,
  };
}
