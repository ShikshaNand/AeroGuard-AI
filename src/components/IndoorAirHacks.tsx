import React, { useState, useMemo } from 'react';
import { Home, ShieldCheck } from 'lucide-react';
import type {
  CADRSizingResult,
  CostTier,
  FamilyProfile,
  IAQHack,
  LocationAirQuality,
} from '../types';
import type { IndoorAirSimulationResult } from '../domain/iaqCalculator';
import { WHO_24H_PM25_LIMIT } from '../domain/airQualityEngine';
import { SlideDeckContainer } from './SlideDeckContainer';
import { RevealOnScroll } from './RevealOnScroll';
import { CadrSizingCard } from './CadrSizingCard';
import { HackSlideCard } from './HackSlideCard';

interface IndoorAirHacksProps {
  location: LocationAirQuality;
  profile: FamilyProfile;
  onUpdateProfile: (updated: FamilyProfile) => void;
  allHacks: IAQHack[];
  activeHackIds: Set<string>;
  onToggleHack: (hackId: string) => void;
  iaqSim: IndoorAirSimulationResult;
  cadrSizing: CADRSizingResult;
  targetAch: number;
  onChangeTargetAch: (ach: number) => void;
}

export const IndoorAirHacks: React.FC<IndoorAirHacksProps> = React.memo(({
  location,
  profile,
  onUpdateProfile,
  allHacks,
  activeHackIds,
  onToggleHack,
  iaqSim,
  cadrSizing,
  targetAch,
  onChangeTargetAch,
}) => {
  const [costFilter, setCostFilter] = useState<'ALL' | CostTier>('ALL');

  const filteredHacks = useMemo(
    () =>
      costFilter === 'ALL'
        ? allHacks
        : allHacks.filter((h) => h.costTier === costFilter),
    [allHacks, costFilter]
  );

  const humidityStatus = useMemo(() => {
    const rh = profile.indoorRelativeHumidityPct;
    if (rh > 60) {
      return {
        tone: 'beige-terracotta text-danger-ink',
        label: `High Indoor Humidity (${rh}%)`,
        advice: 'Sealed rooms above 60% RH encourage mold & dust mites — run kitchen/bath exhaust and pulse-ventilate at peak afternoon sun.',
      };
    }
    if (rh < 35) {
      return {
        tone: 'beige-amber text-warn-ink',
        label: `Dry Winter Air (${rh}%)`,
        advice: 'Air below 35% RH dries nasal mucosa and leaves PM2.5 suspended longer — aim for 40%–50% RH with an evaporative humidifier.',
      };
    }
    return {
      tone: 'beige-sage text-brand-ink',
      label: `Optimal Winter Humidity (${rh}%)`,
      advice: '40%–50% RH keeps airways hydrated and accelerates indoor PM2.5 settling without mold risk.',
    };
  }, [profile.indoorRelativeHumidityPct]);

  return (
    <div className="space-y-6">
      {/* Top Row: Twin Beige Studio Containers (Staggered Reveal) */}
      <div className="stagger-children grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 cols: Indoor Air Quality Checker */}
        <div className="beige-panel lg:col-span-6 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
                <Home className="h-5 w-5 text-brand-ink" aria-hidden="true" />
                How Clean Is Your Indoor Air?
              </h2>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold border ${
                  iaqSim.meetsWhoGuideline
                    ? 'aqi-badge-good'
                    : 'aqi-badge-moderate'
                }`}
              >
                {iaqSim.meetsWhoGuideline ? '✓ Safe Indoor Air (≤15)' : '▲ Needs More Filtering'}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Estimates indoor dust based on outside smog, window drafts, and kitchen cooking—then shows how much your active home hacks clean it up.
            </p>

            {/* 3-Stage Comparison Containers (Staggered Reveal) */}
            <div className="stagger-children mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="beige-terracotta hover-lift rounded-xl p-3">
                <span className="text-[11px] font-semibold text-danger-ink block">Outdoor Smog</span>
                <span className="mt-1 block text-2xl font-extrabold text-danger-warm">
                  {location.pm25}
                </span>
                <span className="text-[11px] text-danger-body">µg/m³ PM2.5</span>
              </div>

              <div className="beige-amber hover-lift rounded-xl p-3">
                <span className="text-[11px] font-semibold text-warn-ink block">Unprotected Indoors</span>
                <span className="mt-1 block text-2xl font-extrabold text-warn-deep">
                  {iaqSim.baselineIndoorPm25}
                </span>
                <span className="text-[11px] text-warn-body">
                  {iaqSim.infiltrationContributionUg} leak + {iaqSim.indoorCombustionContributionUg} indoor
                </span>
              </div>

              <div className="beige-sage hover-lift rounded-xl p-3">
                <span className="text-[11px] font-bold text-brand-ink block">
                  With Your Hacks
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-brand-deep">
                  {iaqSim.optimizedIndoorPm25}
                </span>
                <span className="text-[11px] text-brand-ink font-bold">
                  -{iaqSim.reductionPct}% (-{iaqSim.reductionUgPerM3} µg/m³)
                </span>
              </div>
            </div>

            {/* Visual Progress Bar Toward WHO 15 µg/m³ Target */}
            <div className="beige-inset mt-4 space-y-1.5 rounded-xl p-3.5">
              <div className="flex flex-wrap justify-between gap-1 text-xs">
                <span className="text-ink-body">
                  Indoor Lung Load Reduction:{' '}
                  <strong className="text-brand-ink">
                    {iaqSim.indoorCigarettesAvoidedPerDay} passive cigarettes/day avoided
                  </strong>
                </span>
                <span className="text-ink-subtle font-semibold">
                  WHO Goal: ≤{WHO_24H_PM25_LIMIT} µg/m³
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-track">
                <div
                  style={{ width: `${Math.max(8, Math.min(100, iaqSim.reductionPct))}%` }}
                  className="h-full bg-gradient-to-r from-brand to-brand-light transition-all duration-300"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="beige-sand flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs text-ink-body">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden="true" />
              <span>
                <strong>Why Indoor Hacks Matter:</strong> Urban families spend 85–90% of winter hours indoors. Cutting indoor PM2.5 by {iaqSim.reductionPct}% lowers total 24-hour lung dose more than outdoor masks alone.
              </span>
            </div>
            <div className={`${humidityStatus.tone} rounded-xl px-3.5 py-2 text-[11px] leading-snug`}>
              <strong>{humidityStatus.label}:</strong> {humidityStatus.advice}
            </div>
          </div>
        </div>

        {/* Right 6 cols: Interactive CADR & DIY Corsi-Rosenthal Box Sizing Calculator */}
        <CadrSizingCard
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          cadrSizing={cadrSizing}
          targetAch={targetAch}
          onChangeTargetAch={onChangeTargetAch}
        />
      </div>

      {/* Bottom: Interactive Indoor Air Quality Hacks Slide Deck */}
      <RevealOnScroll delayMs={80}>
        <SlideDeckContainer
          title="Actionable Indoor Air Quality (IAQ) Hacks & Protocols"
          subtitle="Step through each indoor air hack slide or view all at once. Enable or disable any hack to watch your home’s indoor PM2.5 update live above."
          items={filteredHacks}
          getKey={(h) => h.id}
          getLabel={(h) => h.title.split(' ').slice(0, 3).join(' ')}
          defaultMode="slides"
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2"
          headerRightExtra={
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter IAQ hacks by cost">
              {(['ALL', 'Free Today', 'Low-Cost DIY ($15–$65)'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setCostFilter(tier)}
                  aria-pressed={costFilter === tier}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition border ${
                    costFilter === tier
                      ? 'bg-dark-pill text-on-brand border-dark-pill'
                      : 'bg-surface-soft text-ink-secondary border-line-strong hover:bg-chip'
                  }`}
                >
                  {tier === 'ALL' ? 'All Costs' : tier}
                </button>
              ))}
            </div>
          }
          renderSlide={(hack) => (
            <HackSlideCard
              hack={hack}
              isActive={activeHackIds.has(hack.id)}
              onToggle={onToggleHack}
            />
          )}
        />
      </RevealOnScroll>
    </div>
  );
});
IndoorAirHacks.displayName = 'IndoorAirHacks';
