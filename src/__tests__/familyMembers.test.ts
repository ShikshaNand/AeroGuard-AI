import { describe, it, expect } from 'vitest';
import {
  adjustMemberCount,
  applyMemberCounts,
  clampMemberCount,
  MAX_MEMBER_COUNT,
  MIN_MEMBER_COUNT,
} from '../domain/familyMembers';
import { DEFAULT_FAMILY_PROFILE } from '../data/smogPresets';

describe('familyMembers domain logic', () => {
  it('clamps non-finite, negative, and out-of-range member counts safely', () => {
    expect(clampMemberCount(-5)).toBe(MIN_MEMBER_COUNT);
    expect(clampMemberCount(42)).toBe(MAX_MEMBER_COUNT);
    expect(clampMemberCount(Number.NaN)).toBe(MIN_MEMBER_COUNT);
    expect(clampMemberCount(Number.POSITIVE_INFINITY)).toBe(MIN_MEMBER_COUNT);
    expect(clampMemberCount(2.6)).toBe(3);
  });

  it('recalculates householdSize and derived vulnerability flags consistently', () => {
    const updated = applyMemberCounts(DEFAULT_FAMILY_PROFILE, {
      adultsCount: 0,
      childrenCount: 0,
      seniorsCount: 0,
      respiratoryCareCount: 2,
      petsCount: 1,
    });

    // householdSize enforces a minimum of 1 person even if all counters are zeroed
    expect(updated.householdSize).toBe(1);
    expect(updated.hasInfantsOrChildren).toBe(false);
    expect(updated.hasElderlyMembers).toBe(false);
    expect(updated.hasAsthmaOrRespiratory).toBe(true);
    expect(updated.hasPets).toBe(true);
  });

  it('applies stepper deltas without exceeding bounds', () => {
    const incremented = adjustMemberCount(DEFAULT_FAMILY_PROFILE, 'childrenCount', 2);
    expect(incremented.childrenCount).toBe(DEFAULT_FAMILY_PROFILE.childrenCount + 2);
    expect(incremented.householdSize).toBe(DEFAULT_FAMILY_PROFILE.householdSize + 2);

    const floored = adjustMemberCount(DEFAULT_FAMILY_PROFILE, 'petsCount', -99);
    expect(floored.petsCount).toBe(0);
    expect(floored.hasPets).toBe(false);
  });
});
