/**
 * Deterministic Environmental Science Advice Engine
 * Produces grounded, member-aware winter smog guidance across five user intents
 * (DIY indoor filtration, vulnerable-member protection, neighborhood clean-air pledges,
 * atmospheric inversion science, and 24-hour daily schedules) with zero network dependency.
 */

import type { CADRSizingResult, FamilyProfile, LocationAirQuality } from '../types';
import type { IndoorAirSimulationResult } from './iaqCalculator';
import type { AggregateImpactSummary } from './impactCalculator';
import { getAQISeverityMetadata } from './airQualityEngine';

export interface ExpertAdviceContext {
  location: LocationAirQuality;
  profile: FamilyProfile;
  memberSummary: string;
  iaqSim: IndoorAirSimulationResult;
  cadrSizing: CADRSizingResult;
  impactSummary: AggregateImpactSummary;
  bestVentWindow: string;
  bestVentPm25: number;
  worstTrapWindow: string;
  worstTrapPm25: number;
  whoMultiple: number;
  cigsEq: number;
}

const DIY_IAQ_KEYWORDS = ['purifier', 'corsi', 'indoor', 'filter', 'expensive', 'room', 'hack'];
const FAMILY_CARE_KEYWORDS = ['kid', 'child', 'baby', 'senior', 'elder', 'asthma', 'pet', 'dog', 'mask', 'n95'];
const COMMUNITY_KEYWORDS = ['pledge', 'community', 'neighbor', 'school', 'whatsapp', 'draft'];
const SCIENCE_KEYWORDS = ['science', 'impact', 'commute', 'heating', 'cooking', 'inversion', 'why'];

function matchesAnyKeyword(query: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => query.includes(kw));
}

/** Builds member-specific respiratory safeguards for vulnerable household groups. */
export function buildVulnerableMemberNotes(ctx: ExpertAdviceContext): string[] {
  const { profile, location, bestVentWindow, worstTrapWindow } = ctx;
  const notes: string[] = [];

  if (profile.childrenCount > 0) {
    notes.push(
      `**Children (${profile.childrenCount}):** Kids breathe 2× more air per kg of body weight than adults. Keep morning school walks masked with pediatric KN95/FFP2, avoid playground runs during **${worstTrapWindow}**, and shift outdoor play to **${bestVentWindow}**.`
    );
  }
  if (profile.seniorsCount > 0) {
    notes.push(
      `**Seniors 65+ (${profile.seniorsCount}):** Fine winter PM2.5 enters the bloodstream and stresses the heart. Move morning walks from **${worstTrapWindow}** to **${bestVentWindow}** and keep bedroom filtration running overnight.`
    );
  }
  if (profile.respiratoryCareCount > 0) {
    notes.push(
      `**Asthma / Breathing Care (${profile.respiratoryCareCount}):** Cold dry air + traffic NO2 (${location.no2} µg/m³) can trigger wheezing. Keep indoor humidity around 45%, wear a snug N95 outdoors, and keep rescue inhalers handy.`
    );
  }
  if (profile.petsCount > 0) {
    notes.push(
      `**Pets (${profile.petsCount}):** Dogs and cats breathe close to the floor where soot settles. Keep walks short during **${bestVentWindow}**, wet-mop floors instead of dry sweeping, and wipe paws with a damp cloth after coming inside.`
    );
  }

  return notes;
}

function buildDiyIaqAdvice(ctx: ExpertAdviceContext): string {
  const {
    profile,
    location,
    memberSummary,
    whoMultiple,
    iaqSim,
    cadrSizing,
    bestVentWindow,
    bestVentPm25,
    worstTrapWindow,
    worstTrapPm25,
  } = ctx;
  const diySavings = Math.max(0, cadrSizing.commercialEstimatedCostUsd - cadrSizing.corsiEstimatedCostUsd);

  return [
    `### Indoor Air Quality & DIY Filtration Blueprint for ${profile.familyName} (${location.city})`,
    `Tailored for **${memberSummary}** in your **${profile.mainRoomAreaSqM} m²** living area. Right now, outside PM2.5 in **${location.city}** is **${location.pm25} µg/m³** (**${whoMultiple}×** safe limit). Without hacks, drafts and ${profile.cookingType.replace(/_/g, ' ')} leave indoor air near **${iaqSim.baselineIndoorPm25} µg/m³**.`,
    '',
    `#### 1. Right-Sized Filtration (${profile.mainRoomAreaSqM} m² × ${profile.ceilingHeightM} m = ${cadrSizing.roomVolumeCubicM} m³)`,
    `- **Target Clean Air Delivery (${cadrSizing.targetAirChangesPerHour} ACH):** **${cadrSizing.requiredCadrCubicMPerHour} m³/h** (${cadrSizing.requiredCadrCfm} CFM).`,
    `- **Budget DIY Option (~$${cadrSizing.corsiEstimatedCostUsd}):** Build **${cadrSizing.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal Box** (4× MERV-13 filters + 20" box fan). It cleans ~600 m³/h and drops indoor PM2.5 to **~${cadrSizing.projectedIndoorPm25WithCorsi} µg/m³** (saving **$${diySavings}** vs commercial HEPA).`,
    '',
    '#### 2. Three Free Indoor Hacks Today',
    `- **Open Windows Only During ${bestVentWindow}:** Outside air drops to **~${bestVentPm25} µg/m³** (vs **${worstTrapPm25} µg/m³** at ${worstTrapWindow}). Flush stale air for 15 minutes, then close tight.`,
    '- **Wet-Mop Only (No Dry Broom):** Dry sweeping kicks settled floor soot back into the air where kids and pets breathe.',
    '- **Cook on Rear Burners + Exhaust Fan:** Captures up to 80% of kitchen smoke and NO₂ before it spreads to bedrooms.',
    '',
    `> **Direct Impact Explained:** Your active indoor hacks cut home PM2.5 from **${iaqSim.baselineIndoorPm25} → ${iaqSim.optimizedIndoorPm25} µg/m³ (-${iaqSim.reductionPct}%)**, saving each of your **${profile.householdSize} family members** the equivalent of **${iaqSim.indoorCigarettesAvoidedPerDay} passive cigarettes/day**.`,
  ].join('\n');
}

function buildFamilyProtectionAdvice(ctx: ExpertAdviceContext, vulnerableNotes: string[]): string {
  const { profile, location, memberSummary, cigsEq, bestVentWindow, bestVentPm25, iaqSim, impactSummary } = ctx;
  const severity = getAQISeverityMetadata(location.usAqi);

  return [
    `### Family Protection Guide for ${profile.familyName} (${memberSummary})`,
    `In **${location.city}** right now, AQI is **${location.usAqi} (${severity.tier})** with PM2.5 at **${location.pm25} µg/m³** (≈ **${cigsEq} cigarettes/day** outdoors).`,
    '',
    '#### Member-by-Member Safeguards',
    ...(vulnerableNotes.length > 0
      ? vulnerableNotes.map((n) => `- ${n}`)
      : [
          `- **Adults (${profile.adultsCount}):** Wear a fitted N95/FFP2 respirator during commutes and move outdoor workouts to **${bestVentWindow}** when outdoor dust drops to ~${bestVentPm25} µg/m³.`,
        ]),
    '',
    '#### Mask & Outdoor Checklist',
    '- **Choose N95 / KN95 / FFP2** (cloth and surgical masks do not block fine PM2.5 soot). Pinch the nose bridge firmly so air passes through the filter, not around the edges.',
    `- **Keep bedroom air clean overnight:** With your current indoor setup (**${iaqSim.optimizedIndoorPm25} µg/m³**), all **${profile.householdSize} family members** get 8+ hours of lung recovery every night.`,
    '',
    `> **Direct Impact Explained:** Following these steps keeps **${impactSummary.dailyPersonalDoseSavedUg} µg/day** of soot out of each person’s lungs — totaling **${impactSummary.familyWinterDoseSavedMg} mg** prevented across your **${profile.householdSize}-member household** this winter.`,
  ].join('\n');
}

function buildCommunityPledgeAdvice(ctx: ExpertAdviceContext): string {
  const { location, whoMultiple, cigsEq, bestVentWindow, bestVentPm25, worstTrapWindow, worstTrapPm25, impactSummary } =
    ctx;
  const severity = getAQISeverityMetadata(location.usAqi);

  return [
    `### Ready-to-Share Neighborhood & School Clean-Air Message (${location.city})`,
    'Copy and paste this into your school parents’ group, apartment group, or HOA/RWA chat:',
    '',
    '---',
    `🌱 **Winter Smog Alert & Clean-Air Pact — ${location.city}**`,
    `Today our local AQI is **${location.usAqi} (${severity.tier})** with PM2.5 at **${location.pm25} µg/m³** (**${whoMultiple}×** safe limit, equal to **${cigsEq} cigarettes/day** of passive smoke).`,
    '',
    '**4 Simple Steps Our Neighborhood Can Take Today:**',
    '1. 🚗 **No Idling at School Gates & Driveways:** Turn off engines if parked >30 seconds. Cold-start idling emits 2.6× more toxic fumes right at children’s breathing height.',
    `2. 🕒 **Move Outdoor Play & Walks to ${bestVentWindow}:** Avoid outdoor exercise during **${worstTrapWindow}** (~${worstTrapPm25} µg/m³). Afternoon sun clears air down to ~${bestVentPm25} µg/m³.`,
    '3. 🍂 **Zero Open Leaf/Trash Burning:** Pool funds to give night guards electric heaters instead of open wood/leaf fires.',
    '4. 🤝 **3-Family Carpool Pods:** Sharing morning runs removes 2 out of 3 cold engines from our street.',
    '',
    `📊 **Collective Impact:** If 100 families join this winter, we stop **${impactSummary.communityWinterPmAndNoxSavedKg} kg** of street-level smog and **${impactSummary.communityWinterCo2SavedTons} tons of CO₂e** (equal to planting **${impactSummary.equivalentTreesCount.toLocaleString()} urban trees**)!`,
    '---',
  ].join('\n');
}

function buildImpactScienceAdvice(ctx: ExpertAdviceContext): string {
  const { location, profile, iaqSim, impactSummary } = ctx;

  return [
    `### Direct Cause & Effect: How Your Daily Choices Affect ${location.city}’s Smog`,
    `In **${location.city}** (${location.temperatureC}°C, wind ${location.windSpeedKmh} km/h), cold ground air sits under warmer upper air (**Thermal Inversion**), trapping street smoke in a shallow **100–250 m lid**.`,
    '',
    '#### 1. Cold-Start Commuting & Errands',
    '- **Why it happens:** Cold engines take 5 km to warm up their catalytic converter—emitting **2.5×–3× more PM2.5 & NOₓ** during morning rush hour.',
    `- **Your Family’s Impact (${profile.dailyCommuteKm} km/day):** Carpooling, transit, or batching short trips cuts **${impactSummary.householdDailyPmAndNoxSavedGrams} g/day** of street smog and **${impactSummary.householdDailyCo2SavedKg} kg CO₂e/day**.`,
    '',
    '#### 2. Home Heating & Kitchen Smoke',
    '- **Why it happens:** Unvented gas stoves and wood/coal stoves dump NO₂ and fine soot directly into closed winter rooms.',
    `- **Your Family’s Impact (${profile.householdSize} people):** Rear-burner hood capture, draft sealing, and electric induction reduce indoor PM2.5 by **${iaqSim.reductionUgPerM3} µg/m³ (-${iaqSim.reductionPct}%)**.`,
    '',
    `> **Winter Season Total (${profile.familyName}):** Across 90 winter days, your **${profile.householdSize} family members** avoid **${impactSummary.familyWinterDoseSavedMg} mg** of inhaled soot.`,
  ].join('\n');
}

function buildDailyScheduleAdvice(ctx: ExpertAdviceContext, vulnerableNotes: string[]): string {
  const {
    profile,
    location,
    memberSummary,
    whoMultiple,
    cigsEq,
    bestVentWindow,
    bestVentPm25,
    worstTrapWindow,
    worstTrapPm25,
    cadrSizing,
    iaqSim,
    impactSummary,
  } = ctx;
  const afternoonDropPct = Math.max(
    20,
    Math.round(((worstTrapPm25 - bestVentPm25) / Math.max(1, worstTrapPm25)) * 100)
  );

  return [
    `### Personalized 24-Hour Smog Plan for ${profile.familyName}`,
    `**Household:** ${profile.householdSize} total (${memberSummary}) · **Location:** ${location.city} (**AQI ${location.usAqi}**, PM2.5 **${location.pm25} µg/m³**, **${whoMultiple}×** safe limit, ≈ **${cigsEq} cigarettes/day**).`,
    '',
    '#### Today’s Simple Schedule',
    `- **Morning Peak (${worstTrapWindow}, ~${worstTrapPm25} µg/m³):** Keep windows closed. Avoid morning runs or long walks. Use carpool/transit with car AC set to **Recirculate** and fitted N95 masks outdoors.`,
    `- **Best Window (${bestVentWindow}, ~${bestVentPm25} µg/m³):** Afternoon warmth drops smog by **~${afternoonDropPct}%**. Open windows for a quick **15-minute fresh-air flush**, schedule outdoor walks/errands here, then close windows again.`,
    '- **Evening Cooking & Heating:** Cook on rear stove burners with the exhaust hood on (or use electric induction) so kitchen fumes don’t trap indoors.',
    `- **Bedtime Sanctuary:** Run your purifier or **${cadrSizing.corsiRosenthalBoxesNeeded} DIY Corsi-Rosenthal box** (${cadrSizing.requiredCadrCubicMPerHour} m³/h for your ${profile.mainRoomAreaSqM} m² room) to keep indoor air near **${iaqSim.optimizedIndoorPm25} µg/m³**.`,
    '',
    ...(vulnerableNotes.length > 0
      ? ['#### Specific Care for Your Family Members', ...vulnerableNotes.map((n) => `- ${n}`), '']
      : []),
    `> **Direct Impact Explained:** Following this routine protects all **${profile.householdSize} members** from **${impactSummary.dailyPersonalDoseSavedUg} µg/person/day** of soot (**${impactSummary.familyWinterDoseSavedMg} mg** over winter) and cuts **${impactSummary.householdDailyCo2SavedKg} kg CO₂e/day**.`,
  ].join('\n');
}

/**
 * Routes a user prompt to the appropriate deterministic environmental science blueprint.
 */
export function synthesizeExpertScienceResponse(prompt: string, ctx: ExpertAdviceContext): string {
  const q = prompt.toLowerCase();
  const vulnerableNotes = buildVulnerableMemberNotes(ctx);

  if (matchesAnyKeyword(q, DIY_IAQ_KEYWORDS)) {
    return buildDiyIaqAdvice(ctx);
  }
  if (matchesAnyKeyword(q, FAMILY_CARE_KEYWORDS)) {
    return buildFamilyProtectionAdvice(ctx, vulnerableNotes);
  }
  if (matchesAnyKeyword(q, COMMUNITY_KEYWORDS)) {
    return buildCommunityPledgeAdvice(ctx);
  }
  if (matchesAnyKeyword(q, SCIENCE_KEYWORDS)) {
    return buildImpactScienceAdvice(ctx);
  }
  return buildDailyScheduleAdvice(ctx, vulnerableNotes);
}
