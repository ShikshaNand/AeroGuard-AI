/**
 * Core Domain Types for AeroGuard AI — Winter Smog & Urban Air Pollution Assistant.
 * Enforces strict compile-time contracts across air quality telemetry, family profiles,
 * daily routines, indoor air quality hacks, sustainable alternatives, and GenAI advice.
 */

export type AQISeverityTier =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Severe / Hazardous';

export type InversionRiskLevel = 'Low' | 'Moderate' | 'High (Thermal Trap)' | 'Extreme Winter Inversion';

export interface HourlyPollutantPoint {
  /** Hour label in 24h format, e.g., "07:00" */
  hourLabel: string;
  /** Hour index 0..23 */
  hourIndex: number;
  /** Fine particulate matter <= 2.5 microns (µg/m³) */
  pm25: number;
  /** Coarse particulate matter <= 10 microns (µg/m³) */
  pm10: number;
  /** Nitrogen dioxide (µg/m³) */
  no2: number;
  /** Wind speed at 10m (km/h) - key driver of winter dispersion */
  windSpeedKmh: number;
  /** Ambient temperature (°C) - low morning temp drives thermal inversion */
  tempC: number;
  /** Calculated US AQI for this hour */
  usAqi: number;
  /** Whether this hour is an optimal natural ventilation window */
  isSafeVentilationWindow: boolean;
  /** Whether this hour is a severe surface inversion trap */
  isInversionTrap: boolean;
}

export type StagnationTrend = 'Rising' | 'Persisting' | 'Clearing';

export interface StagnationOutlook {
  trend: StagnationTrend;
  threeDayAvgPm25: number;
  summary: string;
}

export interface LocationAirQuality {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isLiveApi: boolean;
  updatedAt: string;
  /** Current fine particulate matter PM2.5 (µg/m³) */
  pm25: number;
  /** Current coarse particulate matter PM10 (µg/m³) */
  pm10: number;
  /** Current Nitrogen Dioxide NO2 (µg/m³) */
  no2: number;
  /** Current Ozone O3 (µg/m³) */
  o3: number;
  /** Current Sulphur Dioxide SO2 (µg/m³) */
  so2: number;
  /** Current Carbon Monoxide CO (µg/m³) */
  co: number;
  /** Current US AQI (0 - 500) */
  usAqi: number;
  /** Ambient temperature (°C) */
  temperatureC: number;
  /** Relative humidity (%) */
  humidityPct: number;
  /** Surface wind speed (km/h) */
  windSpeedKmh: number;
  /** Dominant local winter smog driver explanation */
  dominantSmogSource: string;
  /** 24-hour pollutant and inversion curve */
  hourlyForecast: HourlyPollutantPoint[];
  /** Optional 3-day winter smog stagnation trend outlook */
  stagnationOutlook?: StagnationOutlook;
}

export type CommuteMode =
  | 'car_solo_ice'
  | 'carpool_shared'
  | 'public_transit_metro'
  | 'electric_vehicle'
  | 'active_walk_cycle';

export type HeatingFuelType =
  | 'wood_coal_biomass'
  | 'gas_furnace'
  | 'electric_resistance'
  | 'heat_pump_clean';

export type CookingFuelType =
  | 'lpg_gas_unvented'
  | 'gas_with_chimney_hood'
  | 'induction_electric';

export type HomeSealingLevel = 'leaky_drafty' | 'standard_masonry' | 'tight_weatherstripped';

export interface FamilyProfile {
  familyName: string;
  householdSize: number;
  adultsCount: number;
  childrenCount: number;
  seniorsCount: number;
  respiratoryCareCount: number;
  petsCount: number;
  hasInfantsOrChildren: boolean;
  hasElderlyMembers: boolean;
  hasAsthmaOrRespiratory: boolean;
  hasPregnantMember: boolean;
  hasPets: boolean;
  commuteMode: CommuteMode;
  dailyCommuteKm: number;
  heatingType: HeatingFuelType;
  cookingType: CookingFuelType;
  mainRoomAreaSqM: number;
  ceilingHeightM: number;
  homeSealing: HomeSealingLevel;
  indoorRelativeHumidityPct: number;
}

export interface RoutineOptimization {
  id: string;
  title: string;
  category: 'commute' | 'exercise_kids' | 'ventilation' | 'cooking_heating' | 'errands';
  baselineTimeLabel: string;
  baselineHour: number;
  baselineActivity: string;
  recommendedTimeLabel: string;
  recommendedHour: number;
  recommendedActivity: string;
  /** Whether the user has adopted this low-emission / low-exposure routine */
  isAdopted: boolean;
  /** Micrograms of inhaled PM2.5 saved per person per day */
  personalPm25DoseSavedUg: number;
  /** Percentage drop in inhaled pollution during this activity */
  exposureReductionPct: number;
  /** Grams of primary PM2.5 + NOx prevented per day */
  localPollutantsSavedGrams: number;
  /** Kilograms of CO2e prevented per day */
  co2eSavedKg: number;
  /** Direct scientific explanation of why this shift works */
  directImpactExplanation: string;
  /** Vulnerability tag tailored to the family profile */
  tailoredForGroup: string;
}

export type IAQHackCategory = 'filtration' | 'source_control' | 'ventilation_sealing' | 'humidity_cleaning';
export type CostTier = 'Free Today' | 'Low-Cost DIY ($15–$65)' | 'Smart Upgrade';

export interface IAQHack {
  id: string;
  title: string;
  category: IAQHackCategory;
  costTier: CostTier;
  /** Percentage reduction of indoor PM2.5 contribution or infiltration */
  indoorPm25ReductionPct: number;
  /** Time required to implement */
  setupTimeMinutes: number;
  /** Scientific mechanism explaining how it reduces indoor pollution */
  scientificMechanism: string;
  /** Direct health impact statement for the family */
  directHealthImpact: string;
  /** Actionable step-by-step instructions */
  steps: string[];
  /** Whether relevant to current family profile */
  isHighPriorityForProfile?: boolean;
}

export interface CADRSizingResult {
  roomVolumeCubicM: number;
  targetAirChangesPerHour: number;
  requiredCadrCubicMPerHour: number;
  requiredCadrCfm: number;
  corsiRosenthalBoxesNeeded: number;
  commercialHepaUnitsNeeded: number;
  corsiEstimatedCostUsd: number;
  commercialEstimatedCostUsd: number;
  projectedIndoorPm25WithCorsi: number;
  projectedIndoorPm25Unfiltered: number;
}

export interface SustainableAlternative {
  id: string;
  category: 'mobility' | 'heating' | 'kitchen' | 'community_waste';
  title: string;
  highEmissionHabit: string;
  sustainableAlternative: string;
  /** Daily CO2e saved per household (kg/day) */
  dailyCo2SavedKg: number;
  /** Daily local PM2.5 + NOx avoided per household (grams/day) */
  dailyLocalPmAndNoxSavedGrams: number;
  /** Direct indoor/personal exposure benefit (µg/m³ reduction or % risk reduction) */
  directPersonalBenefit: string;
  /** Clear cause-and-effect explanation of the winter smog mechanism */
  whyChoiceMatters: string;
  /** Practical tip to make the transition realistic for a busy family */
  practicalImplementationTip: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourceMode: 'gemini-live' | 'expert-engine';
  modelUsed?: string;
  keyMetricsCited?: string[];
  fallbackNotice?: string;
}
