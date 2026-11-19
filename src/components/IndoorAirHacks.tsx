import React, { useState } from 'react';
import {
  Home,
  Fan,
  CheckSquare,
  Square,
  Sparkles,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Sliders,
} from 'lucide-react';
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

export const IndoorAirHacks: React.FC<IndoorAirHacksProps> = ({
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

  const filteredHacks =
    costFilter === 'ALL'
      ? allHacks
      : allHacks.filter((h) => h.costTier === costFilter);

  return (
    <div className="space-y-6">
      {/* Top Row: Twin Beige Studio Containers (Staggered Reveal) */}
      <div className="stagger-children grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 cols: Indoor Air Quality Checker */}
        <div className="beige-panel hc-card lg:col-span-6 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[#231D17] flex items-center gap-2">
                <Home className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
                How Clean Is Your Indoor Air?
              </h2>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold border ${
                  iaqSim.meetsWhoGuideline
                    ? 'bg-[#E3F2E8] text-[#1B4D35] border-[#9CCAB0]'
                    : 'bg-[#FEF3D6] text-[#7A4B00] border-[#E5BF73]'
                }`}
              >
                {iaqSim.meetsWhoGuideline ? '✓ Safe Indoor Air (≤15)' : '▲ Needs More Filtering'}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5C5246]">
              Estimates indoor dust based on outside smog, window drafts, and kitchen cooking—then shows how much your active home hacks clean it up.
            </p>

            {/* 3-Stage Comparison Containers (Staggered Reveal) */}
            <div className="stagger-children mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="beige-terracotta hover-lift rounded-xl p-3">
                <span className="text-[11px] font-semibold text-[#8F1D1D] block">Outdoor Smog</span>
                <span className="mt-1 block text-2xl font-extrabold text-[#9A3412]">
                  {location.pm25}
                </span>
                <span className="text-[10px] text-[#7C3A28]">µg/m³ PM2.5</span>
              </div>

              <div className="beige-amber hover-lift rounded-xl p-3">
                <span className="text-[11px] font-semibold text-[#7A4B00] block">Unprotected Indoors</span>
                <span className="mt-1 block text-2xl font-extrabold text-[#92400E]">
                  {iaqSim.baselineIndoorPm25}
                </span>
                <span className="text-[10px] text-[#6B5434]">
                  {iaqSim.infiltrationContributionUg} leak + {iaqSim.indoorCombustionContributionUg} indoor
                </span>
              </div>

              <div className="beige-sage hover-lift rounded-xl p-3">
                <span className="text-[11px] font-bold text-[#1B4D35] block">
                  With Your Hacks
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-[#163D2A]">
                  {iaqSim.optimizedIndoorPm25}
                </span>
                <span className="text-[10px] text-[#1B4D35] font-bold">
                  -{iaqSim.reductionPct}% (-{iaqSim.reductionUgPerM3} µg/m³)
                </span>
              </div>
            </div>

            {/* Visual Progress Bar Toward WHO 15 µg/m³ Target */}
            <div className="beige-inset mt-4 space-y-1.5 rounded-xl p-3.5">
              <div className="flex flex-wrap justify-between gap-1 text-xs">
                <span className="text-[#3E352B]">
                  Indoor Lung Load Reduction:{' '}
                  <strong className="text-[#1B4D35]">
                    {iaqSim.indoorCigarettesAvoidedPerDay} passive cigarettes/day avoided
                  </strong>
                </span>
                <span className="text-[#6A5E50] font-semibold">
                  WHO Goal: ≤{WHO_24H_PM25_LIMIT} µg/m³
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#E2D6C2]">
                <div
                  style={{ width: `${Math.max(8, Math.min(100, iaqSim.reductionPct))}%` }}
                  className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#52B788] transition-all duration-300"
                />
              </div>
            </div>
          </div>

          <div className="beige-sand mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs text-[#3B3228]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#2D6A4F]" aria-hidden="true" />
            <span>
              <strong>Why Indoor Hacks Matter:</strong> Urban families spend 85–90% of winter hours indoors. Cutting indoor PM2.5 by {iaqSim.reductionPct}% lowers total 24-hour lung dose more than outdoor masks alone.
            </span>
          </div>
        </div>

        {/* Right 6 cols: Interactive CADR & DIY Corsi-Rosenthal Box Sizing Calculator */}
        <div className="beige-panel hc-card lg:col-span-6 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[#231D17] flex items-center gap-2">
                <Fan className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
                Room Purifier &amp; DIY Corsi-Rosenthal Box Calculator
              </h2>
              <span className="rounded-full bg-[#EFE7D9] border border-[#DDD0BC] px-2.5 py-0.5 text-xs font-bold text-[#4E4439]">
                5× Clean Air / Hour
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5C5246]">
              Slide your room size below to see how a low-cost $58 DIY filter box (fan + 4 MERV-13 filters) compares with a store-bought HEPA purifier.
            </p>

            {/* Interactive Room Area & Target ACH Sliders (Spacious Full-Width Rows) */}
            <div className="beige-inset mt-4 grid grid-cols-1 gap-4 rounded-2xl p-4">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label htmlFor="cadr-area-slider" className="text-[#3E352B] font-bold">
                    Room Floor Area
                  </label>
                  <span className="rounded-md bg-[#FFFDF8] border border-[#E5DAC8] px-2 py-0.5 font-extrabold text-[#1B4D35]">
                    {profile.mainRoomAreaSqM} m² ({cadrSizing.roomVolumeCubicM} m³)
                  </span>
                </div>
                <input
                  id="cadr-area-slider"
                  type="range"
                  min={10}
                  max={90}
                  value={profile.mainRoomAreaSqM}
                  onChange={(e) =>
                    onUpdateProfile({
                      ...profile,
                      mainRoomAreaSqM: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-[#2D6A4F]"
                />
              </div>

              <div className="border-t border-[#E6DAC7] pt-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label htmlFor="cadr-ach-slider" className="text-[#3E352B] font-bold flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
                    Clean Air Cycles Per Hour
                  </label>
                  <span className="rounded-md bg-[#FFFDF8] border border-[#E5DAC8] px-2 py-0.5 font-extrabold text-[#1B4D35]">
                    {targetAch}× / hour
                  </span>
                </div>
                <input
                  id="cadr-ach-slider"
                  type="range"
                  min={3}
                  max={8}
                  value={targetAch}
                  onChange={(e) => onChangeTargetAch(Number(e.target.value))}
                  className="mt-2 w-full accent-[#2D6A4F]"
                />
              </div>
            </div>

            {/* Required CADR & Side-by-Side Comparison Containers */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="beige-sage rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#163D2A]">
                    DIY Corsi-Rosenthal Box
                  </span>
                  <span className="rounded-md bg-[#2D6A4F] text-[#FFFDF8] px-2 py-0.5 text-[11px] font-bold">
                    ~${cadrSizing.corsiEstimatedCostUsd} Total
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-[#163D2A]">
                  {cadrSizing.corsiRosenthalBoxesNeeded} Unit{cadrSizing.corsiRosenthalBoxesNeeded > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-[11px] text-[#2F523E] leading-relaxed">
                  4× MERV-13 filters + 20&quot; box fan (~600 m³/h CADR per box). Drops room PM2.5 to{' '}
                  <strong className="text-[#163D2A]">~{cadrSizing.projectedIndoorPm25WithCorsi} µg/m³</strong>.
                </p>
              </div>

              <div className="beige-inset rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3E352B]">
                    Commercial True-HEPA
                  </span>
                  <span className="rounded-md bg-[#E5D9C5] text-[#2B241D] px-2 py-0.5 text-[11px] font-bold">
                    ~${cadrSizing.commercialEstimatedCostUsd} Total
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-[#231D17]">
                  {cadrSizing.commercialHepaUnitsNeeded} Unit{cadrSizing.commercialHepaUnitsNeeded > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-[11px] text-[#5C5246] leading-relaxed">
                  Required Room CADR: <strong>{cadrSizing.requiredCadrCubicMPerHour} m³/h</strong> ({cadrSizing.requiredCadrCfm} CFM) at medium quiet speed.
                </p>
              </div>
            </div>
          </div>

          <div className="beige-sand mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs text-[#3B3228]">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
              DIY Savings:{' '}
              <strong className="text-[#1B4D35]">
                ${Math.max(0, cadrSizing.commercialEstimatedCostUsd - cadrSizing.corsiEstimatedCostUsd)} saved
              </strong>{' '}
              for equal or higher MERV-13 fine-soot capture
            </span>
          </div>
        </div>
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
                      ? 'bg-[#2B241D] text-[#FFFDF8] border-[#2B241D]'
                      : 'bg-[#FAF6EE] text-[#4E4439] border-[#D8CBB6] hover:bg-[#EFE7D9]'
                  }`}
                >
                  {tier === 'ALL' ? 'All Costs' : tier}
                </button>
              ))}
            </div>
          }
          renderSlide={(hack) => {
            const isActive = activeHackIds.has(hack.id);
            return (
              <article
                className={`hc-card rounded-2xl border p-5 transition flex flex-col justify-between ${
                  isActive
                    ? 'border-[#9CCAB0] bg-[#FAFDFB]'
                    : 'border-[#E2D6C2] bg-[#FAF6EE]'
                }`}
              >
                <div className="stagger-lines">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#E3F2E8] border border-[#9CCAB0] px-2.5 py-0.5 text-[11px] font-bold text-[#1B4D35]">
                          -{hack.indoorPm25ReductionPct}% Indoor PM2.5
                        </span>
                        <span className="rounded-full bg-[#EFE7D9] border border-[#DFD2BE] px-2.5 py-0.5 text-[11px] font-semibold text-[#4E4439]">
                          {hack.costTier}
                        </span>
                        <span className="text-[11px] font-medium text-[#6A5E50]">
                          ⏱ {hack.setupTimeMinutes} min setup
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-[#231D17] sm:text-lg pt-0.5">
                        {hack.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleHack(hack.id)}
                      aria-pressed={isActive}
                      aria-label={`Toggle ${hack.title}`}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold active:scale-95 transition ${
                        isActive
                          ? 'bg-[#2D6A4F] text-[#FFFDF8] hover:bg-[#1B4D35] shadow-sm'
                          : 'border border-[#CBBBA3] bg-[#FFFDF8] text-[#2B241D] hover:bg-[#EFE7D9]'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckSquare className="h-4 w-4" aria-hidden="true" />
                          <span>Active in Home</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-4 w-4" aria-hidden="true" />
                          <span>Enable Hack</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Split Info Containers: Physics + Family Benefit */}
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="beige-inset hover-lift rounded-xl p-3.5 text-xs text-[#3E352B] leading-relaxed">
                      <strong className="text-[#231D17] block mb-1">🔬 How the Physics Works</strong>
                      {hack.scientificMechanism}
                    </div>
                    <div className="beige-sage hover-lift rounded-xl p-3.5 text-xs text-[#1D3B2B] leading-relaxed">
                      <strong className="text-[#163D2A] flex items-center gap-1 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
                        Direct Family Health Benefit
                      </strong>
                      {hack.directHealthImpact}
                    </div>
                  </div>

                  {/* Actionable Step-by-Step Guide Container (Lines Reveal Sequentially) */}
                  <div className="mt-4 rounded-xl bg-[#FFFDF8] border border-[#E6DAC7] p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5246] block mb-2">
                      Step-by-Step Implementation Checklist:
                    </span>
                    <ol className="stagger-lines space-y-1.5 text-xs text-[#3B3228]">
                      {hack.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFE7D9] text-[10px] font-extrabold text-[#2B241D]">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {hack.isHighPriorityForProfile && (
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#92400E] border-t border-[#E6DAC7] pt-2.5">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Priority safeguard for households with children, seniors, or respiratory sensitivity</span>
                  </div>
                )}
              </article>
            );
          }}
        />
      </RevealOnScroll>
    </div>
  );
};
