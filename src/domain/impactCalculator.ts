/**
 * Direct Impact & Routine Optimization Engine
 * Quantifies both Personal Health Impact (micrograms of inhaled PM2.5 avoided based on
 * respiratory minute-ventilation rates) and Community Atmospheric Impact (cold-start tailpipe
 * PM2.5/NOx and CO2e prevented across household and neighborhood scales).
 */

import type {
  FamilyProfile,
  LocationAirQuality,
  RoutineOptimization,
  SustainableAlternative,
} from '../types';
import { findOptimalVentilationWindows } from './airQualityEngine';

export interface AggregateImpactSummary {
  /** Micrograms of inhaled PM2.5 avoided per person per day */
  dailyPersonalDoseSavedUg: number;
  /** Milligrams of inhaled PM2.5 avoided across the whole household over a 90-day winter */
  familyWinterDoseSavedMg: number;
  /** Daily CO2e avoided by this household (kg/day) */
  householdDailyCo2SavedKg: number;
  /** Daily local PM2.5 + NOx emissions avoided by this household (grams/day) */
  householdDailyPmAndNoxSavedGrams: number;
  /** Total metric tons of CO2e prevented by the community over a 90-day winter */
  communityWinterCo2SavedTons: number;
  /** Total kilograms of local street-level PM2.5 + NOx prevented by the community over 90 days */
  communityWinterPmAndNoxSavedKg: number;
  /** Equivalent mature urban trees absorbing carbon for a year */
  equivalentTreesCount: number;
}

/**
 * Generates 5 dynamic, location- and family-tailored daily routine optimizations
 * anchored to the current city's 24-hour winter inversion forecast.
 */
export function generateTailoredDailyRoutines(
  location: LocationAirQuality,
  profile: FamilyProfile,
  adoptedIds: Set<string>
): RoutineOptimization[] {
  const ventAnalysis = findOptimalVentilationWindows(location.hourlyForecast);
  const morningPeakPm25 = Math.max(location.pm25, ventAnalysis.worstTrapAvgPm25);
  const afternoonLowPm25 = Math.min(location.pm25, ventAnalysis.bestWindowAvgPm25);

  // Minute ventilation during brisk outdoor exercise is ~2.1 m³/hour vs ~0.55 m³/hour resting
  const exerciseVolumeM3 = 1.6;
  const exerciseDoseSavedUg = Math.max(
    18,
    Math.round((morningPeakPm25 - afternoonLowPm25) * exerciseVolumeM3)
  );
  const exerciseReductionPct = Math.max(
    25,
    Math.min(85, ventAnalysis.pm25ReductionPctByTiming || 52)
  );

  // Commute emission math calibrated to dailyCommuteKm + cold-start ambient temperature penalty
  // Sub-10°C winter starts extend catalytic warm-up time and raise primary PM2.5/NOx up to 1.4x
  const commuteKm = Math.max(2, profile.dailyCommuteKm);
  const coldStartTempMultiplier =
    location.temperatureC <= 0 ? 1.4 : location.temperatureC <= 10 ? 1.2 : 1.0;
  const isHighEmissionCommute =
    profile.commuteMode === 'car_solo_ice' || profile.commuteMode === 'carpool_shared';
  const commuteCo2Saved = isHighEmissionCommute
    ? Number((commuteKm * 0.19 * (0.9 + 0.1 * coldStartTempMultiplier)).toFixed(2))
    : Number((commuteKm * 0.06).toFixed(2));
  const commutePmNoxSaved = isHighEmissionCommute
    ? Number((commuteKm * 0.85 * coldStartTempMultiplier).toFixed(1))
    : Number((commuteKm * 0.25).toFixed(1));
  const coldErrandPmNoxSaved = Number((6.4 * coldStartTempMultiplier).toFixed(1));
  const coldErrandDoseSaved = Math.max(18, Math.round(location.pm25 * 0.12));

  const vulnerableTag = profile.hasInfantsOrChildren
    ? 'Protects Developing Lungs (Kids)'
    : profile.hasElderlyMembers
      ? 'Cardiopulmonary Protection (65+)'
      : profile.hasAsthmaOrRespiratory
        ? 'Asthma & Airway Trigger Shield'
        : 'Whole-Household Lung Protection';

  const routines: RoutineOptimization[] = [
    {
      id: 'routine-morning-commute',
      title: 'Morning School & Work Commute Shield',
      category: 'commute',
      baselineTimeLabel: '07:30 – 08:30 (Surface Inversion Peak)',
      baselineHour: 7,
      baselineActivity:
        'Solo cold-start car drop-off & unmasked walk along congested school/office corridor',
      recommendedTimeLabel: '08:15 Shared Carpool / Transit + Fitted N95 & Cabin Recirculate',
      recommendedHour: 8,
      recommendedActivity:
        'Use shared transit/carpool, set vehicle HVAC to Recirculate (blocks 75% tailpipe ultrafine intake), and wear N95 on street segments',
      isAdopted: adoptedIds.has('routine-morning-commute'),
      personalPm25DoseSavedUg: Math.max(25, Math.round(morningPeakPm25 * 0.72)),
      exposureReductionPct: 74,
      localPollutantsSavedGrams: commutePmNoxSaved,
      co2eSavedKg: commuteCo2Saved,
      directImpactExplanation:
        'In winter temperatures, a cold engine burns rich fuel for the first 5 km before the catalytic converter reaches 400°C—emitting up to 2.6× more NOx and primary PM2.5 right inside the morning thermal inversion layer. Carpooling + cabin air recirculation cuts both your street emissions and in-cabin lung dose.',
      tailoredForGroup: vulnerableTag,
    },
    {
      id: 'routine-exercise-walk',
      title: profile.hasPets
        ? 'Outdoor Exercise, Seniors & Dog Walk Shift'
        : 'Outdoor Exercise & Family Walk Window Shift',
      category: 'exercise_kids',
      baselineTimeLabel: `${ventAnalysis.worstTrapLabel} (Thermal Inversion Trap: ~${morningPeakPm25} µg/m³)`,
      baselineHour: 7,
      baselineActivity:
        'Early morning jog, brisk walk, or kids outdoor play when radiative ground cooling traps smoke at breathing height',
      recommendedTimeLabel: `${ventAnalysis.bestWindowLabel} (Solar Mixing Window: ~${afternoonLowPm25} µg/m³)`,
      recommendedHour: 14,
      recommendedActivity:
        'Shift outdoor walks, pet exercise, and children’s park time to mid-afternoon when solar warming lifts the boundary ceiling',
      isAdopted: adoptedIds.has('routine-exercise-walk'),
      personalPm25DoseSavedUg: exerciseDoseSavedUg,
      exposureReductionPct: exerciseReductionPct,
      localPollutantsSavedGrams: 0.4,
      co2eSavedKg: 0.15,
      directImpactExplanation: `During brisk walking or play, human minute ventilation jumps 3× (from 6 L/min to 20–35 L/min) and shifts from nasal filtration to deep mouth breathing. Moving this 45-minute activity from ${ventAnalysis.worstTrapLabel} (${morningPeakPm25} µg/m³) to ${ventAnalysis.bestWindowLabel} (${afternoonLowPm25} µg/m³) directly prevents ${exerciseDoseSavedUg} µg of toxic soot from lodging in alveolar tissue.`,
      tailoredForGroup: profile.hasAsthmaOrRespiratory
        ? 'Critical for Asthma / Bronchial Health'
        : vulnerableTag,
    },
    {
      id: 'routine-pulse-ventilation',
      title: '15-Minute Afternoon Pulse Ventilation Protocol',
      category: 'ventilation',
      baselineTimeLabel: '08:00 or 20:00 (Cracked Windows All Day)',
      baselineHour: 8,
      baselineActivity:
        'Airing out bedrooms in the morning or leaving balcony doors slightly open during evening traffic & heating peaks',
      recommendedTimeLabel: `${ventAnalysis.bestWindowLabel} (15-Min Cross-Breeze + Seal & Filter)`,
      recommendedHour: 14,
      recommendedActivity:
        'Flush stale indoor CO2 for 15 minutes during the afternoon PM2.5 trough, then seal windows and run HEPA/Corsi box on medium',
      isAdopted: adoptedIds.has('routine-pulse-ventilation'),
      personalPm25DoseSavedUg: Math.max(30, Math.round((morningPeakPm25 - afternoonLowPm25) * 0.9)),
      exposureReductionPct: 68,
      localPollutantsSavedGrams: 1.2,
      co2eSavedKg: 0.45,
      directImpactExplanation:
        'Continuous trickling drafts let outdoor winter smog equilibrate indoors while dumping building heat (forcing your heater to burn 15% more fuel). A single 15-minute afternoon purge clears indoor CO2 below 800 ppm while minimizing PM2.5 entry and conserving thermal energy.',
      tailoredForGroup: 'Whole Home IAQ & Thermal Efficiency',
    },
    {
      id: 'routine-evening-cooking',
      title: 'Low-Smoke Evening Kitchen & Back-Burner Protocol',
      category: 'cooking_heating',
      baselineTimeLabel: '19:30 – 20:30 (High-Heat Frying Without Exhaust)',
      baselineHour: 19,
      baselineActivity:
        'Pan-frying or gas cooking on front burners with windows shut against night smog and exhaust hood off',
      recommendedTimeLabel: '19:30 Induction / Steaming + Back-Burner Hood Capture',
      recommendedHour: 19,
      recommendedActivity:
        'Use electric induction/pressure cooking, cook on rear burners directly under the hood canopy, and run exhaust 15 mins after turning off heat',
      isAdopted: adoptedIds.has('routine-evening-cooking'),
      personalPm25DoseSavedUg: profile.cookingType === 'lpg_gas_unvented' ? 95 : 48,
      exposureReductionPct: 79,
      localPollutantsSavedGrams: 3.8,
      co2eSavedKg: 0.55,
      directImpactExplanation:
        'Unvented gas flames and oil pan-frying in a sealed winter apartment can spike indoor PM2.5 to 250+ µg/m³ and NO2 above WHO limits in 12 minutes. Rear burners sit fully beneath the exhaust capture plume, removing 80% of ultrafine aerosols before they diffuse into children’s bedrooms.',
      tailoredForGroup: profile.hasInfantsOrChildren
        ? 'Prevents Pediatric NO2 Airway Inflammation'
        : 'Indoor Ultrafine Particle Control',
    },
    {
      id: 'routine-cold-start-batching',
      title: 'Warm-Engine Errand Chaining (Zero Cold-Start Spikes)',
      category: 'errands',
      baselineTimeLabel: '3 Separate Short Car Trips (Morning / Afternoon / Night)',
      baselineHour: 18,
      baselineActivity:
        'Taking short 2–3 km car trips for groceries, pharmacy, and pickup with a cold engine each time',
      recommendedTimeLabel: '14:30 Single Batched Loop or Cargo-Walk/E-Bike',
      recommendedHour: 15,
      recommendedActivity:
        'Chain errands immediately onto the end of a warm-engine trip or walk during the 14:30 low-smog window',
      isAdopted: adoptedIds.has('routine-cold-start-batching'),
      personalPm25DoseSavedUg: coldErrandDoseSaved,
      exposureReductionPct: 45,
      localPollutantsSavedGrams: coldErrandPmNoxSaved,
      co2eSavedKg: 1.35,
      directImpactExplanation:
        'A three-way catalytic converter is virtually inactive below 300°C. In winter, three separate 3 km trips with a cold engine emit more tailpipe PM2.5, carbon monoxide, and unburned hydrocarbons than a single 40 km highway drive with a warm engine.',
      tailoredForGroup: 'Neighborhood Street-Level Smog Prevention',
    },
  ];

  return routines;
}

/**
 * Calculates aggregate personal health dose reductions and community emission reductions
 * across adopted daily routines and selected sustainable lifestyle swaps.
 */
export function calculateAggregateImpact(
  routines: RoutineOptimization[],
  selectedSwaps: SustainableAlternative[],
  communityHouseholdsCount: number,
  householdSize: number
): AggregateImpactSummary {
  const safeCommunityCount = Math.max(1, Math.min(100_000, communityHouseholdsCount));
  const safeHouseholdSize = Math.max(1, Math.min(20, householdSize));

  const adoptedRoutines = routines.filter((r) => r.isAdopted);

  const routineDoseUg = adoptedRoutines.reduce((sum, r) => sum + r.personalPm25DoseSavedUg, 0);
  const swapDoseBonusUg = selectedSwaps.length * 18;
  const dailyPersonalDoseSavedUg = Math.round(routineDoseUg + swapDoseBonusUg);

  // Over a 90-day severe winter season across all family members (1000 µg = 1 mg)
  const familyWinterDoseSavedMg = Number(
    ((dailyPersonalDoseSavedUg * safeHouseholdSize * 90) / 1000).toFixed(1)
  );

  const routineCo2 = adoptedRoutines.reduce((sum, r) => sum + r.co2eSavedKg, 0);
  const swapCo2 = selectedSwaps.reduce((sum, s) => sum + s.dailyCo2SavedKg, 0);
  const householdDailyCo2SavedKg = Number((routineCo2 + swapCo2).toFixed(2));

  const routinePmNox = adoptedRoutines.reduce((sum, r) => sum + r.localPollutantsSavedGrams, 0);
  const swapPmNox = selectedSwaps.reduce((sum, s) => sum + s.dailyLocalPmAndNoxSavedGrams, 0);
  const householdDailyPmAndNoxSavedGrams = Number((routinePmNox + swapPmNox).toFixed(1));

  // 90-day winter season scaled to communityHouseholdsCount
  const communityWinterCo2SavedTons = Number(
    ((householdDailyCo2SavedKg * safeCommunityCount * 90) / 1000).toFixed(1)
  );
  const communityWinterPmAndNoxSavedKg = Number(
    ((householdDailyPmAndNoxSavedGrams * safeCommunityCount * 90) / 1000).toFixed(1)
  );

  // 1 mature urban tree absorbs ~22 kg CO2 per year
  const equivalentTreesCount = Math.max(
    1,
    Math.round((communityWinterCo2SavedTons * 1000) / 22)
  );

  return {
    dailyPersonalDoseSavedUg,
    familyWinterDoseSavedMg,
    householdDailyCo2SavedKg,
    householdDailyPmAndNoxSavedGrams,
    communityWinterCo2SavedTons,
    communityWinterPmAndNoxSavedKg,
    equivalentTreesCount,
  };
}
