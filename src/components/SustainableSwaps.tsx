import React, { useState } from 'react';
import {
  Leaf,
  Users,
  Trees,
  Wind,
  HeartPulse,
  CheckCircle2,
  Share2,
  Check,
  Lightbulb,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import type {
  FamilyProfile,
  LocationAirQuality,
  SustainableAlternative,
} from '../types';
import type { AggregateImpactSummary } from '../domain/impactCalculator';
import { SlideDeckContainer } from './SlideDeckContainer';
import { RevealOnScroll } from './RevealOnScroll';

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

export const SustainableSwaps: React.FC<SustainableSwapsProps> = ({
  location,
  profile,
  allSwaps,
  selectedSwapIds,
  onToggleSwap,
  communityHouseholdsCount,
  onChangeCommunityHouseholdsCount,
  impactSummary,
}) => {
  const [copiedPledge, setCopiedPledge] = useState(false);

  const handleCopyCommunityPledge = async () => {
    const pledgeText = [
      `🌱 Community Winter Clean-Air Pact — ${location.city} (Current AQI: ${location.usAqi}, PM2.5: ${location.pm25} µg/m³)`,
      `Our household (${profile.familyName}) is adopting low-emission winter routines & clean-air swaps:`,
      `• Personal Lung Protection: -${impactSummary.dailyPersonalDoseSavedUg} µg/day inhaled PM2.5 per person (${impactSummary.familyWinterDoseSavedMg} mg saved this winter)`,
      `• Household Emissions Cut: -${impactSummary.householdDailyPmAndNoxSavedGrams}g PM2.5/NOx & -${impactSummary.householdDailyCo2SavedKg}kg CO2e every day`,
      `• Neighborhood Multiplier: If ${communityHouseholdsCount} families in our community join for 90 winter days, we eliminate ${impactSummary.communityWinterPmAndNoxSavedKg} kg of street-level smog (PM2.5+NOx) and ${impactSummary.communityWinterCo2SavedTons} tons of CO2e (≈ ${impactSummary.equivalentTreesCount} mature urban trees)!`,
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pledgeText);
      }
      setCopiedPledge(true);
      setTimeout(() => setCopiedPledge(false), 3000);
    } catch {
      setCopiedPledge(true);
      setTimeout(() => setCopiedPledge(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Container 1: Direct Impact Visualizer & Neighborhood Community Multiplier */}
      <div className="beige-panel hc-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#231D17] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
              Direct Personal &amp; Community Impact Multiplier ({location.city})
            </h2>
            <p className="text-xs text-[#5C5246] sm:text-sm">
              Every sustainable swap below directly protects your family’s indoor air while removing toxic cold-start and combustion plumes from your neighborhood’s winter inversion layer.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyCommunityPledge}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-4 py-2.5 text-xs font-bold text-[#FFFDF8] shadow-sm hover:bg-[#1B4D35] transition shrink-0"
          >
            {copiedPledge ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Pledge Copied for WhatsApp / RWA!</span>
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
              className="text-xs font-bold text-[#2B241D]"
            >
              Scale Impact Across Your School District / Apartment Block (90-Day Winter Season):
            </label>
            <span className="rounded-full bg-[#2D6A4F] px-3 py-1 text-xs font-extrabold text-[#FFFDF8]">
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
            className="mt-2.5 w-full accent-[#2D6A4F]"
          />
          <div className="mt-1 flex justify-between text-[11px] font-medium text-[#6A5E50]">
            <span>10 Families (1 Street)</span>
            <span>100 Families (Apartment Block)</span>
            <span>500 Families (School Zone)</span>
            <span>1,000 Families (Ward)</span>
          </div>
        </div>

        {/* 4 Distinct Bento Stat Containers (Staggered Line-by-Line Reveal) */}
        <div className="stagger-children mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="beige-terracotta hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#8F1D1D]">
              <span>Your Family’s Lung Shield</span>
              <HeartPulse className="h-4 w-4 text-[#C44536]" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#231D17]">
              {impactSummary.familyWinterDoseSavedMg} mg
            </p>
            <p className="mt-1 text-[11px] text-[#5C3A2E] leading-relaxed">
              Toxic PM2.5 kept out of {profile.householdSize} family members’ lungs over 90 winter days ({impactSummary.dailyPersonalDoseSavedUg} µg/person/day)
            </p>
          </div>

          <div className="beige-sand hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#4E4439]">
              <span>Neighborhood Smog Removed</span>
              <Wind className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#231D17]">
              {impactSummary.communityWinterPmAndNoxSavedKg} kg
            </p>
            <p className="mt-1 text-[11px] text-[#5C5246] leading-relaxed">
              Primary street-level PM2.5 + NOx prevented across {communityHouseholdsCount} homes ({impactSummary.householdDailyPmAndNoxSavedGrams} g/day per home)
            </p>
          </div>

          <div className="beige-sage hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1B4D35]">
              <span>Community Carbon Cut</span>
              <Leaf className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#163D2A]">
              {impactSummary.communityWinterCo2SavedTons} Tons
            </p>
            <p className="mt-1 text-[11px] text-[#2F523E] leading-relaxed">
              Metric tons of CO₂e prevented this winter ({impactSummary.householdDailyCo2SavedKg} kg/day per household)
            </p>
          </div>

          <div className="beige-amber hover-lift rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A4B00]">
              <span>Urban Forest Equivalent</span>
              <Trees className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#231D17]">
              {impactSummary.equivalentTreesCount.toLocaleString()} Trees
            </p>
            <p className="mt-1 text-[11px] text-[#6B5434] leading-relaxed">
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
          renderSlide={(swap) => {
            const isSelected = selectedSwapIds.has(swap.id);
            return (
              <article
                className={`hc-card rounded-2xl border p-5 transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#9CCAB0] bg-[#FAFDFB]'
                    : 'border-[#E2D6C2] bg-[#FAF6EE]'
                }`}
              >
                <div className="stagger-lines space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-[#EFE7D9] border border-[#DFD2BE] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#4E4439]">
                      {swap.category.replace('_', ' ')}
                    </span>
                    <h3 className="mt-1.5 text-base font-extrabold text-[#231D17] sm:text-lg">
                      {swap.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleSwap(swap.id)}
                    aria-pressed={isSelected}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-[#2D6A4F] text-[#FFFDF8] hover:bg-[#1B4D35] shadow-sm'
                        : 'border border-[#CBBBA3] bg-[#FFFDF8] text-[#2B241D] hover:bg-[#EFE7D9]'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{isSelected ? 'Committed' : 'Commit to Swap'}</span>
                  </button>
                </div>

                {/* Split Before/After Containers */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                  <div className="beige-terracotta rounded-xl p-3.5 text-[#4A261B] leading-relaxed">
                    <strong className="text-[#9A3412] block mb-1">✗ Instead of:</strong>
                    {swap.highEmissionHabit}
                  </div>
                  <div className="beige-sage rounded-xl p-3.5 text-[#1D3B2B] font-medium leading-relaxed">
                    <strong className="text-[#163D2A] flex items-center gap-1 mb-1">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />✓ Sustainable Alternative:
                    </strong>
                    {swap.sustainableAlternative}
                  </div>
                </div>

                {/* Direct Health & Atmospheric Cause-and-Effect Containers */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                  <div className="beige-inset rounded-xl p-3.5 text-[#3E352B] leading-relaxed">
                    <p className="flex items-start gap-2">
                      <HeartPulse className="h-4 w-4 shrink-0 text-[#2D6A4F] mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-[#1B4D35] block mb-0.5">Direct Personal Benefit:</strong>
                        {swap.directPersonalBenefit}
                      </span>
                    </p>
                  </div>
                  <div className="beige-inset rounded-xl p-3.5 text-[#3E352B] leading-relaxed">
                    <p className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 shrink-0 text-[#92400E] mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-[#231D17] block mb-0.5">Why Your Choice Matters:</strong>
                        {swap.whyChoiceMatters}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer: Practical Tip Container & Per-Household Emissions Saved */}
              <div className="mt-4 space-y-2.5 border-t border-[#E6DAC7] pt-3.5 text-xs">
                <div className="beige-amber rounded-xl p-3 flex items-start gap-2 text-[#5C4426]">
                  <Lightbulb className="h-4 w-4 shrink-0 text-[#B45309] mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-[#7A4B00]">Practical Family Tip:</strong> {swap.practicalImplementationTip}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFFDF8] border border-[#E5DAC8] px-3.5 py-2 text-[11px] text-[#4E4439]">
                  <span>
                    Local Smog Cut:{' '}
                    <strong className="text-[#231D17]">
                      -{swap.dailyLocalPmAndNoxSavedGrams} g PM/NOx/day
                    </strong>
                  </span>
                  <span>
                    Carbon Cut:{' '}
                    <strong className="text-[#1B4D35]">-{swap.dailyCo2SavedKg} kg CO₂e/day</strong>
                  </span>
                </div>
              </div>
            </article>
          );
        }}
      />
      </RevealOnScroll>
    </div>
  );
};
