import { describe, it, expect } from 'vitest';
import {
  synthesizeExpertScienceResponse,
  type ExpertAdviceContext,
} from '../domain/expertAdviceEngine';
import {
  DEFAULT_FAMILY_PROFILE,
  IAQ_HACKS_CATALOGUE,
  WINTER_SMOG_CITY_PRESETS,
} from '../data/smogPresets';
import {
  calculateCadrAndCorsiSizing,
  simulateIndoorAirQuality,
} from '../domain/iaqCalculator';
import {
  calculateAggregateImpact,
  generateTailoredDailyRoutines,
} from '../domain/impactCalculator';

function buildContext(): ExpertAdviceContext {
  const location = WINTER_SMOG_CITY_PRESETS[0];
  const profile = DEFAULT_FAMILY_PROFILE;
  const iaqSim = simulateIndoorAirQuality(location.pm25, profile, IAQ_HACKS_CATALOGUE.slice(0, 2));
  const cadrSizing = calculateCadrAndCorsiSizing(profile.mainRoomAreaSqM, profile.ceilingHeightM, location.pm25, 5);
  const routines = generateTailoredDailyRoutines(location, profile, new Set(['routine-morning-commute']));
  const impactSummary = calculateAggregateImpact(routines, [], 100, profile.householdSize);

  return {
    location,
    profile,
    memberSummary: '2 Adults, 1 Kid, 1 Senior (65+)',
    iaqSim,
    cadrSizing,
    impactSummary,
    bestVentWindow: '14:00 – 16:00',
    bestVentPm25: 133,
    worstTrapWindow: '07:00 – 09:00',
    worstTrapPm25: 351,
    whoMultiple: 16.5,
    cigsEq: 11.3,
  };
}

describe('expertAdviceEngine deterministic intent routing', () => {
  const ctx = buildContext();

  it('routes DIY indoor air and purifier prompts to the filtration blueprint', () => {
    const out = synthesizeExpertScienceResponse('How do I build a DIY Corsi purifier?', ctx);
    expect(out).toContain('DIY Filtration Blueprint');
    expect(out).toContain('Corsi-Rosenthal Box');
  });

  it('routes vulnerable member & mask prompts to the Family Protection Guide', () => {
    const out = synthesizeExpertScienceResponse('Which N95 mask should my kids wear?', ctx);
    expect(out).toContain('Family Protection Guide');
    expect(out).toContain('Children (1):');
  });

  it('routes community & school prompts to the shareable Clean-Air Message', () => {
    const out = synthesizeExpertScienceResponse('Draft a school WhatsApp pledge', ctx);
    expect(out).toContain('Clean-Air Pact');
    expect(out).toContain('No Idling at School Gates');
  });

  it('routes science & inversion prompts to Cause & Effect analysis', () => {
    const out = synthesizeExpertScienceResponse('Explain thermal inversion science', ctx);
    expect(out).toContain('Thermal Inversion');
    expect(out).toContain('Cold-Start Commuting');
  });

  it('routes general prompts to the comprehensive 24-Hour Smog Plan', () => {
    const out = synthesizeExpertScienceResponse('Give me a simple schedule for today', ctx);
    expect(out).toContain('Personalized 24-Hour Smog Plan');
    expect(out).toContain('14:00 – 16:00');
  });
});
