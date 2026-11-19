/**
 * Family Member Count Domain Logic
 * Single source of truth for applying member-count changes to a FamilyProfile,
 * keeping derived fields (householdSize, vulnerability flags) consistent everywhere.
 */

import type { FamilyProfile } from '../types';

export type MemberCountField =
  | 'adultsCount'
  | 'childrenCount'
  | 'seniorsCount'
  | 'respiratoryCareCount'
  | 'petsCount';

export const MIN_MEMBER_COUNT = 0;
export const MAX_MEMBER_COUNT = 10;

/** Clamps a member count to the supported integer range. */
export function clampMemberCount(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_MEMBER_COUNT;
  }
  return Math.max(MIN_MEMBER_COUNT, Math.min(MAX_MEMBER_COUNT, Math.round(value)));
}

/**
 * Returns a new profile with the given member counts applied and all derived
 * fields recalculated. People = adults + children + seniors (minimum 1);
 * respiratory-care and pets are tracked separately and do not add to headcount.
 */
export function applyMemberCounts(
  profile: FamilyProfile,
  patch: Partial<Pick<FamilyProfile, MemberCountField>>
): FamilyProfile {
  const adultsCount = clampMemberCount(patch.adultsCount ?? profile.adultsCount);
  const childrenCount = clampMemberCount(patch.childrenCount ?? profile.childrenCount);
  const seniorsCount = clampMemberCount(patch.seniorsCount ?? profile.seniorsCount);
  const respiratoryCareCount = clampMemberCount(
    patch.respiratoryCareCount ?? profile.respiratoryCareCount
  );
  const petsCount = clampMemberCount(patch.petsCount ?? profile.petsCount);

  return {
    ...profile,
    adultsCount,
    childrenCount,
    seniorsCount,
    respiratoryCareCount,
    petsCount,
    householdSize: Math.max(1, adultsCount + childrenCount + seniorsCount),
    hasInfantsOrChildren: childrenCount > 0,
    hasElderlyMembers: seniorsCount > 0,
    hasAsthmaOrRespiratory: respiratoryCareCount > 0,
    hasPets: petsCount > 0,
  };
}

/** Adjusts a single member count by a delta (e.g. +1 / -1 stepper buttons). */
export function adjustMemberCount(
  profile: FamilyProfile,
  field: MemberCountField,
  delta: number
): FamilyProfile {
  return applyMemberCounts(profile, { [field]: profile[field] + delta });
}
