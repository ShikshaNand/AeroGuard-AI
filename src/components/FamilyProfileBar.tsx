import React from 'react';
import {
  Users,
  Baby,
  HeartPulse,
  Dog,
  X,
  User,
  RotateCcw,
} from 'lucide-react';
import type { FamilyProfile } from '../types';
import { sanitizeTextInput } from '../utils/security';
import { applyMemberCounts, type MemberCountField } from '../domain/familyMembers';
import { MemberCounterCard } from './MemberCounterCard';
import { LifestyleSettingsGrid } from './LifestyleSettingsGrid';

interface FamilyProfileBarProps {
  profile: FamilyProfile;
  onUpdateProfile: (updated: FamilyProfile) => void;
  onResetDefaults?: () => void;
  onClose?: () => void;
}

export const FamilyProfileBar: React.FC<FamilyProfileBarProps> = ({
  profile,
  onUpdateProfile,
  onResetDefaults,
  onClose,
}) => {
  const updateMemberCounts = (
    patch: Partial<Pick<FamilyProfile, MemberCountField>>
  ) => {
    onUpdateProfile(applyMemberCounts(profile, patch));
  };

  return (
    <section
      aria-label="Family and Lifestyle Profile Configuration"
      className="beige-panel animate-drawer-enter rounded-3xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle pb-4">
        <div>
          <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            Personalize Advice for Your Family &amp; Home
          </h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Change member counts or home settings below—your daily schedule, indoor air calculations, and AI coach update immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sage-pill border border-sage-line px-3 py-1 text-xs font-bold text-brand-ink">
            Total: {profile.householdSize} {profile.householdSize === 1 ? 'Person' : 'People'} · Auto-saved
          </span>
          {onResetDefaults && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1 rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-chip-hover"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close family profile panel"
              className="inline-flex items-center gap-1 rounded-xl border border-line-strong bg-chip px-3 py-1.5 text-xs font-bold text-ink hover:bg-chip-hover"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Family Name & Exact Member Count Steppers */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-bold text-ink-secondary">
            Household Members (Adjust Counts)
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="family-name-input" className="text-xs font-semibold text-ink-subtle">
              Family Name:
            </label>
            <input
              id="family-name-input"
              type="text"
              maxLength={40}
              value={profile.familyName}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  familyName: sanitizeTextInput(e.target.value, 40) || 'My Family',
                })
              }
              className="rounded-xl border border-line-strong bg-surface-soft px-3 py-1.5 text-xs font-bold text-ink focus:bg-surface focus:border-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <MemberCounterCard
            id="member-adults-input"
            label="Adults"
            sublabel="Ages 18–64"
            icon={<User className="h-4 w-4" aria-hidden="true" />}
            value={profile.adultsCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ adultsCount: val })}
          />
          <MemberCounterCard
            id="member-children-input"
            label="Kids & Infants"
            sublabel="Developing lungs"
            icon={<Baby className="h-4 w-4" aria-hidden="true" />}
            value={profile.childrenCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ childrenCount: val })}
          />
          <MemberCounterCard
            id="member-seniors-input"
            label="Seniors (65+)"
            sublabel="Heart & lung care"
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            value={profile.seniorsCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ seniorsCount: val })}
          />
          <MemberCounterCard
            id="member-asthma-input"
            label="Asthma / Breathing Care"
            sublabel="Sensitive airways"
            icon={<HeartPulse className="h-4 w-4 text-warn-ink" aria-hidden="true" />}
            value={profile.respiratoryCareCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ respiratoryCareCount: val })}
          />
          <MemberCounterCard
            id="member-pets-input"
            label="Pets at Home"
            sublabel="Dogs & cats"
            icon={<Dog className="h-4 w-4 text-ink-subtle" aria-hidden="true" />}
            value={profile.petsCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ petsCount: val })}
          />
        </div>
      </div>

      {/* Row 2: 4 Clean Lifestyle & Home Containers */}
      <LifestyleSettingsGrid profile={profile} onUpdateProfile={onUpdateProfile} />
    </section>
  );
};
