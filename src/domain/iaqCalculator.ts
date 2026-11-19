/**
 * Indoor Air Quality (IAQ) & CADR Filtration Sizing Engine
 * Implements steady-state indoor particulate infiltration and source modeling,
 * plus Clean Air Delivery Rate (CADR) sizing comparing commercial HEPA units
 * against low-cost DIY Corsi-Rosenthal MERV-13 filtration boxes.
 */

import type { CADRSizingResult, FamilyProfile, IAQHack } from '../types';
import { BERKELEY_EARTH_CIGARETTE_PM25, WHO_24H_PM25_LIMIT } from './airQualityEngine';

export interface IndoorAirSimulationResult {
  baselineIndoorPm25: number;
  optimizedIndoorPm25: number;
  reductionUgPerM3: number;
  reductionPct: number;
  meetsWhoGuideline: boolean;
  indoorCigarettesAvoidedPerDay: number;
  infiltrationContributionUg: number;
  indoorCombustionContributionUg: number;
}

const SEALING_INFILTRATION_FACTOR: Record<FamilyProfile['homeSealing'], number> = {
  leaky_drafty: 0.78,
  standard_masonry: 0.62,
  tight_weatherstripped: 0.45,
};

const HEATING_INDOOR_SURGE_UG: Record<FamilyProfile['heatingType'], number> = {
  wood_coal_biomass: 42,
  gas_furnace: 6,
  electric_resistance: 0,
  heat_pump_clean: 0,
};

const COOKING_INDOOR_SURGE_UG: Record<FamilyProfile['cookingType'], number> = {
  lpg_gas_unvented: 28,
  gas_with_chimney_hood: 9,
  induction_electric: 2,
};

/**
 * Simulates baseline vs. hack-optimized indoor PM2.5 (µg/m³) given outdoor smog,
 * building shell tightness, heating/cooking fuels, and active IAQ interventions.
 */
export function simulateIndoorAirQuality(
  outdoorPm25: number,
  profile: FamilyProfile,
  activeHacks: IAQHack[]
): IndoorAirSimulationResult {
  const safeOutdoor = Math.max(0, outdoorPm25);
  const infiltrationFactor = SEALING_INFILTRATION_FACTOR[profile.homeSealing] ?? 0.62;

  const infiltrationContributionUg = Math.round(safeOutdoor * infiltrationFactor);
  const indoorCombustionContributionUg =
    (HEATING_INDOOR_SURGE_UG[profile.heatingType] ?? 0) +
    (COOKING_INDOOR_SURGE_UG[profile.cookingType] ?? 0);

  const baselineIndoorPm25 = Math.max(
    4,
    Math.round(infiltrationContributionUg + indoorCombustionContributionUg)
  );

  // Multiplicative retention across active hacks with diminishing returns floor
  let remainingFraction = 1.0;
  for (const hack of activeHacks) {
    const clampedReduction = Math.max(0, Math.min(0.85, hack.indoorPm25ReductionPct / 100));
    remainingFraction *= 1 - clampedReduction;
  }

  // Cap total reduction at 92% so indoor PM2.5 remains physically realistic
  const effectiveMultiplier = Math.max(0.08, remainingFraction);
  const optimizedIndoorPm25 = Math.max(3, Math.round(baselineIndoorPm25 * effectiveMultiplier));

  const reductionUgPerM3 = Math.max(0, baselineIndoorPm25 - optimizedIndoorPm25);
  const reductionPct =
    baselineIndoorPm25 > 0
      ? Math.round((reductionUgPerM3 / baselineIndoorPm25) * 100)
      : 0;

  const meetsWhoGuideline = optimizedIndoorPm25 <= WHO_24H_PM25_LIMIT;
  const indoorCigarettesAvoidedPerDay = Number(
    (reductionUgPerM3 / BERKELEY_EARTH_CIGARETTE_PM25).toFixed(1)
  );

  return {
    baselineIndoorPm25,
    optimizedIndoorPm25,
    reductionUgPerM3,
    reductionPct,
    meetsWhoGuideline,
    indoorCigarettesAvoidedPerDay,
    infiltrationContributionUg,
    indoorCombustionContributionUg,
  };
}

/**
 * Calculates required Clean Air Delivery Rate (CADR) for a target Air Changes Per Hour (ACH, default 5)
 * and compares DIY Corsi-Rosenthal MERV-13 boxes against commercial HEPA purifiers.
 */
export function calculateCadrAndCorsiSizing(
  roomAreaSqM: number,
  ceilingHeightM: number,
  outdoorPm25: number,
  targetAch = 5
): CADRSizingResult {
  const safeArea = Math.max(8, Math.min(250, roomAreaSqM));
  const safeHeight = Math.max(2.2, Math.min(5.0, ceilingHeightM));
  const safeAch = Math.max(2, Math.min(10, targetAch));

  const roomVolumeCubicM = Number((safeArea * safeHeight).toFixed(1));
  const requiredCadrCubicMPerHour = Math.round(roomVolumeCubicM * safeAch);
  const requiredCadrCfm = Math.round(requiredCadrCubicMPerHour / 1.699);

  // A 4-filter 20" MERV-13 Corsi-Rosenthal Box delivers ~600 m³/h (~350 CFM) on quiet medium speed
  const singleCorsiCadrM3h = 600;
  // A typical mid-size commercial HEPA purifier delivers ~320 m³/h (~190 CFM)
  const singleCommercialHepaCadrM3h = 320;

  const corsiRosenthalBoxesNeeded = Math.max(
    1,
    Math.ceil(requiredCadrCubicMPerHour / singleCorsiCadrM3h)
  );
  const commercialHepaUnitsNeeded = Math.max(
    1,
    Math.ceil(requiredCadrCubicMPerHour / singleCommercialHepaCadrM3h)
  );

  const corsiEstimatedCostUsd = corsiRosenthalBoxesNeeded * 58;
  const commercialEstimatedCostUsd = commercialHepaUnitsNeeded * 210;

  // Mass balance steady state: C_in = (P * a * C_out) / (a + k + CADR/V)
  const infiltrationAch = 0.65;
  const penetrationFactor = 0.8;
  const naturalDepositionK = 0.25;

  const projectedIndoorPm25Unfiltered = Math.max(
    5,
    Math.round(
      (penetrationFactor * infiltrationAch * Math.max(10, outdoorPm25)) /
        (infiltrationAch + naturalDepositionK)
    )
  );

  const effectiveCadrPerVolume = (corsiRosenthalBoxesNeeded * singleCorsiCadrM3h) / roomVolumeCubicM;
  const projectedIndoorPm25WithCorsi = Math.max(
    3,
    Math.round(
      (penetrationFactor * infiltrationAch * Math.max(10, outdoorPm25)) /
        (infiltrationAch + naturalDepositionK + effectiveCadrPerVolume)
    )
  );

  return {
    roomVolumeCubicM,
    targetAirChangesPerHour: safeAch,
    requiredCadrCubicMPerHour,
    requiredCadrCfm,
    corsiRosenthalBoxesNeeded,
    commercialHepaUnitsNeeded,
    corsiEstimatedCostUsd,
    commercialEstimatedCostUsd,
    projectedIndoorPm25WithCorsi,
    projectedIndoorPm25Unfiltered,
  };
}
