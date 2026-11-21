import React, { useState, useRef, useEffect } from 'react';
import {
  Leaf,
  Users,
  Trees,
  Wind,
  HeartPulse,
  Share2,
  Check,
} from 'lucide-react';
import type {
  FamilyProfile,
  LocationAirQuality,
  SustainableAlternative,
} from '../types';
import type { AggregateImpactSummary } from '../domain/impactCalculator';
import { SlideDeckContainer } from './SlideDeckContainer';
import { RevealOnScroll } from './RevealOnScroll';
import { SwapSlideCard } from './SwapSlideCard';

interface SustainableSwapsProps {
  location: LocationAirQuality;
  profile: FamilyProfile;
  allSwaps: SustainableAlternative[];
  selectedSwapIds: Set<string>;
  onToggleSwap: (swapId: string) => void;
  communityHouseholdsCount: number;
  onChangeCommunityHouseholdsCount: (count: number) => void;
  impactSummary: AggregateImpactSummary;
}

export const SustainableSwaps: React.FC<SustainableSwapsProps> = React.memo(({
  location,
  profile,
  allSwaps,
  selectedSwapIds,
  onToggleSwap,
  communityHouseholdsCount,
  onChangeCommunityHouseholdsCount,
  impactSummary,
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyCommunityPledge = async () => {
    const pledgeText = [
      `🌱 Community Winter Clean-Air Pact — ${location.city} (Current AQI: ${location.usAqi}, PM2.5: ${location.pm25} µg/m³)`,
      `Our household (${profile.familyName}) is adopting low-emission winter routines & clean-air swaps:`,
      `• Personal Lung Protection: -${impactSummary.dailyPersonalDoseSavedUg} µg/day inhaled PM2.5 per person (${impactSummary.familyWinterDoseSavedMg} mg saved this winter)`,
      `• Household Emissions Cut: -${impactSummary.householdDailyPmAndNoxSavedGrams}g PM2.5/NOx & -${impactSummary.householdDailyCo2SavedKg}kg CO2e every day`,
      `• Neighborhood Multiplier: If ${communityHouseholdsCount} families in our community join for 90 winter days, we eliminate ${impactSummary.communityWinterPmAndNoxSavedKg} kg of street-level smog (PM2.5+NOx) and ${impactSummary.communityWinterCo2SavedTons} tons of CO2e (≈ ${impactSummary.equivalentTreesCount} mature urban trees)!`,
    ].join('\n');

    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(pledgeText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Container 1: Direct Impact Visualizer & Neighborhood Community Multiplier */}
      <div className="beige-panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-ink" aria-hidden="true" />
              Direct Personal &amp; Community Impact Multiplier ({location.city})
            </h2>
            <p className="text-xs text-ink-muted sm:text-sm">
              Every sustainable swap below directly protects your family’s indoor air while removing toxic cold-start and combustion plumes from your neighborhood’s winter inversion layer.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyCommunityPledge}
            aria-live="polite"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-on-brand shadow-sm hover:bg-brand-hover transition shrink-0"
          >
            {copyStatus === 'copied' ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Pledge Copied for WhatsApp / RWA!</span>
              </>
            ) : copyStatus === 'failed' ? (
              <>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span>Clipboard Blocked — Copy Manually</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span>Copy Neighborhood Clean-Air Pledge</span>
              </>
            )}
          </button>
        </div>

        {/* Community Scale Slider Container */}
        <div className="beige-inset mt-4 rounded-xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="community-scale-slider"
              className="text-xs font-bold text-ink"
            >
              Scale Impact Across Your School District / Apartment Block (90-Day Winter Season):
            </label>
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-extrabold text-on-brand">
              {communityHouseholdsCount} Participating Households
            </span>
          </div>
          <input
            id="community-scale-slider"
            type="range"
            min={10}
            max={1000}
            step={10}
            value={communityHouseholdsCount}
            onChange={(e) => onChangeCommunityHouseholdsCount(Number(e.target.value))}
            className="mt-2.5 w-full accent-brand"
          />
          <div className="mt-1 flex justify-between text-[11px] font-medium text-ink-subtle">
            <span>10 Families (1 Street)</span>
            <span>100 Families (Apartment Block)</span>
            <span>500 Families (School Zone)</span>
            <span>1,000 Families (Ward)</span>
          </div>
        </div>

        {/* 4 Distinct Bento Stat Containers (Staggered Line-by-Line Reveal) */}
        <div className="stagger-children mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="beige-terracotta hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-danger-ink">
              <span>Your Family’s Lung Shield</span>
              <HeartPulse className="h-4 w-4 text-danger-ink" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {impactSummary.familyWinterDoseSavedMg} mg
            </p>
            <p className="mt-1 text-[11px] text-danger-body leading-relaxed">
              Toxic PM2.5 kept out of {profile.householdSize} family members’ lungs over 90 winter days ({impactSummary.dailyPersonalDoseSavedUg} µg/person/day)
            </p>
          </div>

          <div className="beige-sand hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink-secondary">
              <span>Neighborhood Smog Removed</span>
              <Wind className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {impactSummary.communityWinterPmAndNoxSavedKg} kg
            </p>
            <p className="mt-1 text-[11px] text-ink-muted leading-relaxed">
              Primary street-level PM2.5 + NOx prevented across {communityHouseholdsCount} homes ({impactSummary.householdDailyPmAndNoxSavedGrams} g/day per home)
            </p>
          </div>

          <div className="beige-sage hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-brand-ink">
              <span>Community Carbon Cut</span>
              <Leaf className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-brand-deep">
              {impactSummary.communityWinterCo2SavedTons} Tons
            </p>
            <p className="mt-1 text-[11px] text-brand-soft leading-relaxed">
              Metric tons of CO₂e prevented this winter ({impactSummary.householdDailyCo2SavedKg} kg/day per household)
            </p>
          </div>

          <div className="beige-amber hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-warn-ink">
              <span>Urban Forest Equivalent</span>
              <Trees className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {impactSummary.equivalentTreesCount.toLocaleString()} Trees
            </p>
            <p className="mt-1 text-[11px] text-warn-body leading-relaxed">
              Equivalent number of mature urban trees absorbing carbon for a full year
            </p>
          </div>
        </div>
      </div>

      {/* Container 2: Interactive Sustainable Alternatives Slide Deck */}
      <RevealOnScroll delayMs={80}>
        <SlideDeckContainer
          title="Sustainable Winter Alternatives & Direct Impact Slides"
          subtitle="Browse each lifestyle swap one slide at a time to understand exactly how your choice cuts both indoor exposure and neighborhood smog."
          items={allSwaps}
          getKey={(s) => s.id}
          getLabel={(s) => s.title.split(' ').slice(0, 3).join(' ')}
          defaultMode="slides"
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2"
          renderSlide={(swap) => (
            <SwapSlideCard
              swap={swap}
              isSelected={selectedSwapIds.has(swap.id)}
              onToggle={onToggleSwap}
            />
          )}
      />
      </RevealOnScroll>
    </div>
  );
});
SustainableSwaps.displayName = 'SustainableSwaps';
