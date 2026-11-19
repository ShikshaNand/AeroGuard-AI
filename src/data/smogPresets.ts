/**
 * Curated Winter Smog City Presets, IAQ Hacks Catalogue & Sustainable Alternatives
 * Grounded in WHO 2021 Air Quality Guidelines, EPA residential combustion factors,
 * and winter boundary-layer meteorology.
 */

import type {
  FamilyProfile,
  HourlyPollutantPoint,
  IAQHack,
  LocationAirQuality,
  SustainableAlternative,
} from '../types';
import { pm25ToUsAqi } from '../domain/airQualityEngine';

/**
 * Generates a realistic 24-hour winter thermal inversion pollutant curve.
 * Winter urban smog follows a characteristic bimodal (double-peak) curve:
 * - Morning inversion trap (06:00–09:00): Cold ground + rush hour + overnight heating
 * - Afternoon solar mixing window (13:00–16:00): Surface warming lifts the boundary ceiling & increases wind dispersion
 * - Late evening accumulation (19:00–23:00): Rapid radiative cooling collapses the inversion lid over evening emissions
 */
export function buildHourlyWinterCurve(
  basePm25: number,
  basePm10: number,
  baseNo2: number,
  baseTempC: number,
  baseWindKmh: number
): HourlyPollutantPoint[] {
  // Diurnal multiplier representing winter boundary layer height fluctuations
  const diurnalFactors: number[] = [
    1.12, 1.08, 1.04, 1.02, 1.06, 1.18, // 00:00 - 05:00
    1.34, 1.45, 1.38, 1.20, 0.98, 0.80, // 06:00 - 11:00 (Morning peak -> rising lid)
    0.66, 0.56, 0.52, 0.55, 0.68, 0.88, // 12:00 - 17:00 (Afternoon solar mixing window)
    1.10, 1.28, 1.38, 1.35, 1.26, 1.18, // 18:00 - 23:00 (Evening collapse trap)
  ];

  return diurnalFactors.map((factor, hourIndex) => {
    const hourLabel = `${String(hourIndex).padStart(2, '0')}:00`;
    const pm25 = Math.max(5, Math.round(basePm25 * factor));
    const pm10 = Math.max(10, Math.round(basePm10 * factor));
    const no2 = Math.max(6, Math.round(baseNo2 * (0.85 + (factor - 0.5) * 0.4)));

    // Afternoon is warmer and windier; early morning is coldest and calmest
    const isAfternoon = hourIndex >= 12 && hourIndex <= 16;
    const isMorningOrNightTrap =
      (hourIndex >= 6 && hourIndex <= 9) || (hourIndex >= 19 && hourIndex <= 22);

    const tempDelta = isAfternoon ? 4.5 : isMorningOrNightTrap ? -2.5 : 0;
    const windMultiplier = isAfternoon ? 1.65 : isMorningOrNightTrap ? 0.6 : 0.9;

    const tempC = Number((baseTempC + tempDelta).toFixed(1));
    const windSpeedKmh = Number(Math.max(1.5, baseWindKmh * windMultiplier).toFixed(1));
    const usAqi = pm25ToUsAqi(pm25);

    return {
      hourLabel,
      hourIndex,
      pm25,
      pm10,
      no2,
      windSpeedKmh,
      tempC,
      usAqi,
      isSafeVentilationWindow: hourIndex >= 13 && hourIndex <= 15,
      isInversionTrap: isMorningOrNightTrap,
    };
  });
}

export const WINTER_SMOG_CITY_PRESETS: LocationAirQuality[] = [
  {
    id: 'delhi-ncr',
    city: 'Delhi NCR',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    isLiveApi: false,
    updatedAt: 'Winter Inversion Benchmark',
    pm25: 248,
    pm10: 395,
    no2: 78,
    o3: 24,
    so2: 19,
    co: 1850,
    usAqi: pm25ToUsAqi(248),
    temperatureC: 11.2,
    humidityPct: 74,
    windSpeedKmh: 4.5,
    dominantSmogSource:
      'Indo-Gangetic plain winter thermal inversion trapping vehicular cold-start NOx, biomass heating, and regional crop-residue aerosols under calm winds (< 5 km/h).',
    hourlyForecast: buildHourlyWinterCurve(248, 395, 78, 11.2, 4.5),
  },
  {
    id: 'lahore-pk',
    city: 'Lahore',
    country: 'Pakistan',
    latitude: 31.5204,
    longitude: 74.3587,
    isLiveApi: false,
    updatedAt: 'Winter Inversion Benchmark',
    pm25: 215,
    pm10: 340,
    no2: 69,
    o3: 28,
    so2: 22,
    co: 1620,
    usAqi: pm25ToUsAqi(215),
    temperatureC: 12.0,
    humidityPct: 71,
    windSpeedKmh: 5.2,
    dominantSmogSource:
      'Dense morning radiation fog combining with two-stroke/diesel transport emissions and peri-urban brick kiln/industrial plumes.',
    hourlyForecast: buildHourlyWinterCurve(215, 340, 69, 12.0, 5.2),
  },
  {
    id: 'ulaanbaatar-mn',
    city: 'Ulaanbaatar',
    country: 'Mongolia',
    latitude: 47.8864,
    longitude: 106.9057,
    isLiveApi: false,
    updatedAt: 'Winter Inversion Benchmark',
    pm25: 192,
    pm10: 285,
    no2: 58,
    o3: 18,
    so2: 46,
    co: 2100,
    usAqi: pm25ToUsAqi(192),
    temperatureC: -16.5,
    humidityPct: 64,
    windSpeedKmh: 3.8,
    dominantSmogSource:
      'Sub-zero river-valley basin inversion trapping residential solid-fuel stove heating emissions and cold-start vehicle exhaust.',
    hourlyForecast: buildHourlyWinterCurve(192, 285, 58, -16.5, 3.8),
  },
  {
    id: 'milan-po-valley',
    city: 'Milan (Po Valley)',
    country: 'Italy',
    latitude: 45.4642,
    longitude: 9.19,
    isLiveApi: false,
    updatedAt: 'Winter Inversion Benchmark',
    pm25: 78,
    pm10: 112,
    no2: 62,
    o3: 22,
    so2: 9,
    co: 780,
    usAqi: pm25ToUsAqi(78),
    temperatureC: 5.4,
    humidityPct: 82,
    windSpeedKmh: 4.1,
    dominantSmogSource:
      'Alpine-enclosed Po Valley basin stagnation trapping diesel/urban traffic NOx, residential wood-pellet heating, and secondary ammonium nitrate aerosols.',
    hourlyForecast: buildHourlyWinterCurve(78, 112, 62, 5.4, 4.1),
  },
  {
    id: 'salt-lake-city',
    city: 'Salt Lake City',
    country: 'United States',
    latitude: 40.7608,
    longitude: -111.891,
    isLiveApi: false,
    updatedAt: 'Winter Inversion Benchmark',
    pm25: 68,
    pm10: 96,
    no2: 51,
    o3: 26,
    so2: 7,
    co: 690,
    usAqi: pm25ToUsAqi(68),
    temperatureC: -2.4,
    humidityPct: 76,
    windSpeedKmh: 5.8,
    dominantSmogSource:
      'Wasatch Mountain snow-covered valley floor reflecting sunlight while warm upper air traps highway commuter NOx and wood-burning particulates.',
    hourlyForecast: buildHourlyWinterCurve(68, 96, 51, -2.4, 5.8),
  },
  {
    id: 'sarajevo-ba',
    city: 'Sarajevo',
    country: 'Bosnia & Herzegovina',
    latitude: 43.8563,
    longitude: 18.4131,
    isLiveApi: false,
    updatedAt: 'Winter Inversion Benchmark',
    pm25: 158,
    pm10: 225,
    no2: 54,
    o3: 19,
    so2: 34,
    co: 1410,
    usAqi: pm25ToUsAqi(158),
    temperatureC: 1.8,
    humidityPct: 85,
    windSpeedKmh: 3.2,
    dominantSmogSource:
      'Deep mountain canyon topography locking residential coal/wood furnace smoke and aging vehicle exhaust beneath a 150-meter winter fog ceiling.',
    hourlyForecast: buildHourlyWinterCurve(158, 225, 54, 1.8, 3.2),
  },
];

export const DEFAULT_FAMILY_PROFILE: FamilyProfile = {
  familyName: 'My Family',
  householdSize: 4,
  adultsCount: 2,
  childrenCount: 1,
  seniorsCount: 1,
  respiratoryCareCount: 1,
  petsCount: 1,
  hasInfantsOrChildren: true,
  hasElderlyMembers: true,
  hasAsthmaOrRespiratory: true,
  hasPregnantMember: false,
  hasPets: true,
  commuteMode: 'car_solo_ice',
  dailyCommuteKm: 18,
  heatingType: 'gas_furnace',
  cookingType: 'lpg_gas_unvented',
  mainRoomAreaSqM: 28,
  ceilingHeightM: 2.8,
  homeSealing: 'leaky_drafty',
  indoorRelativeHumidityPct: 32,
};

export const IAQ_HACKS_CATALOGUE: IAQHack[] = [
  {
    id: 'hack-corsi-rosenthal',
    title: 'Build a DIY Corsi-Rosenthal MERV-13 Filtration Box',
    category: 'filtration',
    costTier: 'Low-Cost DIY ($15–$65)',
    indoorPm25ReductionPct: 58,
    setupTimeMinutes: 25,
    scientificMechanism:
      'Combines four pleated MERV-13 HVAC filters taped into a cube with a 20-inch box fan and cardboard shroud. The massive filter surface area lowers pressure drop, delivering ~600 m³/h (350 CFM) of clean air—outperforming $250 commercial HEPA units on fine winter soot (PM2.5).',
    directHealthImpact:
      'Drops bedroom & living-room PM2.5 by ~55–65% within 35 minutes, reducing overnight pediatric and elderly lung inflammation.',
    steps: [
      'Gather four 20×20×2 inch MERV-13 pleated filters, one 20-inch UL-listed box fan, duct tape, and the fan’s cardboard box.',
      'Tape the four filters into a vertical square walls cube with airflow arrows pointing INWARD toward the center.',
      'Seal the bottom with cardboard and tape the box fan on top blowing UPWARD, adding a cardboard corner shroud to stop air backflow.',
      'Run on Medium-Low speed in the family’s primary living or sleeping room for quiet, high-CADR filtration.',
    ],
    isHighPriorityForProfile: true,
  },
  {
    id: 'hack-bedroom-sanctuary',
    title: 'Create an Overnight "Clean-Air Sleep Sanctuary" Room',
    category: 'filtration',
    costTier: 'Free Today',
    indoorPm25ReductionPct: 36,
    setupTimeMinutes: 10,
    scientificMechanism:
      'Families spend 8–10 continuous hours sleeping when outdoor radiative cooling causes the worst nighttime smog spikes. Concentrating your purifier in one closed-door bedroom achieves 6+ Air Changes Per Hour (ACH) instead of diluting it across the whole house.',
    directHealthImpact:
      'Gives children and elderly members 8 hours of low-PM2.5 recovery time, lowering morning blood-pressure spikes and airway mucus.',
    steps: [
      'Move your primary HEPA purifier or DIY filter fan into the main sleeping room 45 minutes before bedtime.',
      'Keep bedroom windows and hallway doors closed overnight; place a rolled damp towel across the bottom door gap if hallway air is smoky.',
      'Avoid burning candles, coil repellents, or incense inside the sanctuary room.',
    ],
    isHighPriorityForProfile: true,
  },
  {
    id: 'hack-wet-mop-microfiber',
    title: 'Two-Bucket Damp Microfiber Mopping (Zero Dry-Sweeping)',
    category: 'humidity_cleaning',
    costTier: 'Free Today',
    indoorPm25ReductionPct: 22,
    setupTimeMinutes: 15,
    scientificMechanism:
      'In winter, coarse and fine smog particles settle onto floors and carpets. Dry sweeping with a broom or using a non-HEPA vacuum resuspend up to 40% of settled PM2.5 and toxic heavy-metal dust right back into toddlers’ breathing zones (0.5–1.0 m above floor).',
    directHealthImpact:
      'Eliminates indoor resuspension spikes, protecting crawling infants, kids, and household pets who breathe closest to floor level.',
    steps: [
      'Retire dry brooms and feather dusters during winter smog episodes.',
      'Wipe hard floors, windowsills, and fan blades daily with a damp microfiber cloth or wet mop that traps particles via capillary adhesion.',
      'Establish a strict "Shoes Off + Outer Coat Shake" zone at the front entrance mat.',
    ],
    isHighPriorityForProfile: true,
  },
  {
    id: 'hack-back-burner-exhaust',
    title: 'Back-Burner Cooking + 15-Min Post-Cook Hood Purge',
    category: 'source_control',
    costTier: 'Free Today',
    indoorPm25ReductionPct: 28,
    setupTimeMinutes: 2,
    scientificMechanism:
      'Wall-mounted range hoods only cover 50% of front stove burners, allowing buoyant thermal plumes of PM2.5, acrolein, and NO2 to spill into the kitchen. Back burners sit directly inside the hood’s negative-pressure capture zone.',
    directHealthImpact:
      'Prevents 150–300 µg/m³ evening kitchen PM2.5 spikes and cuts indoor NO2 exposure by up to 70%.',
    steps: [
      'Always boil, sauté, or simmer on the REAR stove burners directly beneath the exhaust fan intake.',
      'Turn on the externally vented range hood (or a window-exhaust fan in the kitchen) 2 minutes BEFORE lighting the stove.',
      'Leave the exhaust running for 15 minutes AFTER cooking finishes while keeping the kitchen door closed to the rest of the home.',
    ],
    isHighPriorityForProfile: true,
  },
  {
    id: 'hack-window-draft-sealing',
    title: 'Removable Painter’s Tape & Foam Weatherstripping on Leaky Frames',
    category: 'ventilation_sealing',
    costTier: 'Low-Cost DIY ($15–$65)',
    indoorPm25ReductionPct: 30,
    setupTimeMinutes: 30,
    scientificMechanism:
      'During winter cold snaps, the "stack effect" (warm indoor air rising) creates negative pressure at lower windows and door frames, sucking outdoor PM2.5 through 1–2 mm perimeter cracks even when windows appear closed.',
    directHealthImpact:
      'Cuts outdoor smog infiltration factor from 0.78 down to 0.45 while saving 12–18% on winter heating energy.',
    steps: [
      'Hold a wet finger or tissue strip along window perimeters on a cold morning to spot cold air infiltration leaks.',
      'Apply removable blue painter’s tape or peel-and-stick EPDM foam weatherstripping along unused winter window sashes.',
      'Leave ONE south/west-facing window unsealed so you can still perform the 15-minute afternoon pulse ventilation.',
    ],
  },
  {
    id: 'hack-humidity-45-zone',
    title: 'Maintain 40%–50% Indoor Relative Humidity Shield',
    category: 'humidity_cleaning',
    costTier: 'Free Today',
    indoorPm25ReductionPct: 16,
    setupTimeMinutes: 5,
    scientificMechanism:
      'Winter heating drops indoor humidity below 25%, which desiccates nasal cilia (your body’s natural PM2.5 trap) and keeps ultrafine particles suspended longer. At 45% RH, airborne particles hygroscopically coagulate and settle faster while airway mucosa stays intact.',
    directHealthImpact:
      'Strengthens upper-respiratory mucociliary clearance in children and seniors without promoting mold growth (stays below 55%).',
    steps: [
      'Dry laundry on an indoor rack in the living room or simmer a pot of water on an electric induction plate to raise dry winter air from 25% to 45% RH.',
      'If using an ultrasonic humidifier, use ONLY distilled or RO-filtered water so tap-water minerals are not aerosolized as white-dust PM2.5.',
    ],
  },
];

export const SUSTAINABLE_ALTERNATIVES_CATALOGUE: SustainableAlternative[] = [
  {
    id: 'swap-school-carpool-transit',
    category: 'mobility',
    title: '3-Family School/Work Carpool Pod or Metro Shift',
    highEmissionHabit: 'Driving solo in a cold-engine petrol/diesel car during 07:30 morning rush hour',
    sustainableAlternative:
      'Rotate a 3-family neighborhood carpool pod or combine transit + N95 masked last-mile walk',
    dailyCo2SavedKg: 3.4,
    dailyLocalPmAndNoxSavedGrams: 14.2,
    directPersonalBenefit:
      'Reduces roadside school-gate PM2.5 & NO2 hotspot concentrations by up to 38% where children wait at breathing height (1.1 m).',
    whyChoiceMatters:
      'During winter mornings, automotive catalytic converters take 5–8 minutes to reach operating temperature. Taking 2 out of 3 cold cars off neighborhood streets directly eliminates the highest-toxicity cold-start tailpipe plumes trapped beneath the morning inversion lid.',
    practicalImplementationTip:
      'Pair with 2 families within a 500 m radius using a shared Mon/Wed/Fri rotation schedule—saving each parent 120+ hours of winter traffic driving per year.',
  },
  {
    id: 'swap-clean-heating-insulation',
    category: 'heating',
    title: 'Replace Solid-Fuel / Open Biomass Heating with Heat Pump + Thermal Curtains',
    highEmissionHabit: 'Burning wood logs, coal, or unseasoned biomass in residential stoves or uninsulated rooms',
    sustainableAlternative:
      'Switch to a high-efficiency inverter heat pump / infrared panel paired with heavy thermal window curtains & door draft stoppers',
    dailyCo2SavedKg: 5.8,
    dailyLocalPmAndNoxSavedGrams: 48.5,
    directPersonalBenefit:
      'Eliminates 35–60 µg/m³ of carcinogenic polycyclic aromatic hydrocarbons (PAHs) and black carbon leaking back into your own living room.',
    whyChoiceMatters:
      'Even an eco-certified wood stove emits more fine PM2.5 per hour than 15 modern passenger cars. Across winter valleys (from Milan to Delhi and Salt Lake City), residential solid-fuel heating accounts for 35% to 55% of total street-level winter PM2.5.',
    practicalImplementationTip:
      'Installing thermal blackout curtains and under-door draft snakes ($18) retains 22% more room heat overnight, allowing you to lower thermostat demand immediately.',
  },
  {
    id: 'swap-induction-pressure-cooking',
    category: 'kitchen',
    title: 'Plug-In Induction Cooktop & Electric Pressure Kettle Swap',
    highEmissionHabit: 'Unvented LPG/Natural Gas burner cooking 3× daily in a sealed winter apartment',
    sustainableAlternative:
      'Use a portable plug-in induction hob, electric pressure cooker, and electric kettle for 80% of daily winter meals',
    dailyCo2SavedKg: 1.1,
    dailyLocalPmAndNoxSavedGrams: 6.4,
    directPersonalBenefit:
      'Cuts indoor kitchen Nitrogen Dioxide (NO2) by 75% and reduces childhood asthma flare risk by 32% (meta-analysis benchmark).',
    whyChoiceMatters:
      'Gas burners release NO2, carbon monoxide, and formaldehyde directly into indoor air at a time of year when windows are sealed against outdoor smog. Induction transfers 85% of electromagnetic energy directly into the pan with zero indoor combustion exhaust.',
    practicalImplementationTip:
      'A single plug-in portable induction burner costs ~$40–$55, boils water in half the time of gas, and requires zero kitchen remodeling.',
  },
  {
    id: 'swap-zero-waste-leaf-compost',
    category: 'community_waste',
    title: 'Community Zero-Burn Leaf Mulching & Guard Heater Electrification',
    highEmissionHabit: 'Open burning of dry winter leaves, garden trimmings, or scrap wood for outdoor warmth',
    sustainableAlternative:
      'Convert fallen leaves into insulating garden mulch/compost and provide security staff with electric radiant heaters + insulated booths',
    dailyCo2SavedKg: 2.9,
    dailyLocalPmAndNoxSavedGrams: 62.0,
    directPersonalBenefit:
      'Prevents localized 400–800 µg/m³ toxic smoke plumes from seeping into ground-floor and 1st-floor bedrooms overnight.',
    whyChoiceMatters:
      'Smoldering open fires of damp winter leaves or waste burn at low oxygen temperatures (300–500°C), releasing 100× more PM2.5, dioxins, and carbon monoxide per kilogram than controlled combustion. In calm winter winds, a single bonfires blankets an entire 300-meter apartment block.',
    practicalImplementationTip:
      'Pool $5 per apartment in your Resident Welfare Association (RWA) or HOA to buy electric oil-fin heaters and thermal jackets for night guards.',
  },
  {
    id: 'swap-anti-idling-school-zone',
    category: 'mobility',
    title: 'Zero-Idling School Gate & Warm-Up Protocol ("Turn Key, Drive Gently")',
    highEmissionHabit: 'Idling car engine for 10 mins in the driveway to warm up and 15 mins at school pickup gates',
    sustainableAlternative:
      'Limit cold-engine warm-up to 30 seconds before driving gently, and switch off engines whenever parked > 30 seconds',
    dailyCo2SavedKg: 1.45,
    dailyLocalPmAndNoxSavedGrams: 9.8,
    directPersonalBenefit:
      'Stops exhaust blow-back into your own home garage/windows and keeps school pickup zones safe for kids.',
    whyChoiceMatters:
      'Modern fuel-injected engines warm up twice as fast under gentle driving load as they do idling. Idling in cold weather runs an incomplete fuel-rich cycle that fouls spark plugs, wastes fuel, and dumps concentrated NOx at child breathing height.',
    practicalImplementationTip:
      'Use an interior windshield cover ($10) overnight so you never have to idle the engine for 10 minutes just to defrost glass.',
  },
  {
    id: 'swap-offpeak-solar-appliances',
    category: 'heating',
    title: 'Solar-Peak Appliance Shifting & 19°C Smart Thermostat Setpoint',
    highEmissionHabit: 'Running heavy electric heaters, dryers, and geysers during 19:00–22:00 coal-peaker grid hours',
    sustainableAlternative:
      'Pre-heat thermal water tanks and run laundry during 12:00–15:00 solar grid peak; wear merino/fleece layers at a 19–20°C indoor setpoint',
    dailyCo2SavedKg: 2.2,
    dailyLocalPmAndNoxSavedGrams: 11.5,
    directPersonalBenefit:
      'Avoids over-drying indoor winter air (keeping relative humidity near 45%), protecting nasal passages from cracking.',
    whyChoiceMatters:
      'Every 1°C reduction in winter thermostat setting cuts heating energy consumption by ~8%. Shifting heavy electrical loads from evening peak to midday solar hours reduces regional coal/gas peaker plant SO2 and PM2.5 plumes upwind of your city.',
    practicalImplementationTip:
      'Pre-heating rooms by +1°C at 14:30 while solar power is abundant lets thermal mass radiate warmth through the early evening peak.',
  },
];
