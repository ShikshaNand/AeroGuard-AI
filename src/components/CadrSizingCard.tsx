import React from 'react';
import { Fan, DollarSign, Sliders } from 'lucide-react';
import type { CADRSizingResult, FamilyProfile } from '../types';

interface CadrSizingCardProps {
  profile: FamilyProfile;
  onUpdateProfile: (updated: FamilyProfile) => void;
  cadrSizing: CADRSizingResult;
  targetAch: number;
  onChangeTargetAch: (ach: number) => void;
}

/**
 * Interactive CADR & DIY Corsi-Rosenthal Box Sizing Calculator Card
 * Compares a ~$58 DIY 4-filter MERV-13 box against commercial True-HEPA purifiers.
 */
export const CadrSizingCard: React.FC<CadrSizingCardProps> = React.memo(
  ({ profile, onUpdateProfile, cadrSizing, targetAch, onChangeTargetAch }) => {
    const diySavings = Math.max(
      0,
      cadrSizing.commercialEstimatedCostUsd - cadrSizing.corsiEstimatedCostUsd
    );

    return (
      <div className="beige-panel lg:col-span-6 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <Fan className="h-5 w-5 text-brand-ink" aria-hidden="true" />
              Room Purifier &amp; DIY Corsi-Rosenthal Box Calculator
            </h2>
            <span className="rounded-full bg-chip border border-line-strong px-2.5 py-0.5 text-xs font-bold text-ink-secondary">
              {targetAch}× Clean Air / Hour
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Slide your room size below to see how a low-cost $58 DIY filter box (fan + 4 MERV-13 filters) compares with a store-bought HEPA purifier.
          </p>

          {/* Interactive Room Area & Target ACH Sliders */}
          <div className="beige-inset mt-4 grid grid-cols-1 gap-4 rounded-2xl p-4">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <label htmlFor="cadr-area-slider" className="text-ink-body font-bold">
                  Room Floor Area
                </label>
                <span className="rounded-md bg-surface border border-line px-2 py-0.5 font-extrabold text-brand-ink">
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
                className="mt-2 w-full accent-brand"
              />
            </div>

            <div className="border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label htmlFor="cadr-ach-slider" className="text-ink-body font-bold flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                  Clean Air Cycles Per Hour
                </label>
                <span className="rounded-md bg-surface border border-line px-2 py-0.5 font-extrabold text-brand-ink">
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
                className="mt-2 w-full accent-brand"
              />
            </div>
          </div>

          {/* Required CADR & Side-by-Side Comparison Containers */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="beige-sage rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-brand-deep">
                  DIY Corsi-Rosenthal Box
                </span>
                <span className="rounded-md bg-brand text-on-brand px-2 py-0.5 text-[11px] font-bold">
                  ~${cadrSizing.corsiEstimatedCostUsd} Total
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-brand-deep">
                {cadrSizing.corsiRosenthalBoxesNeeded} Unit
                {cadrSizing.corsiRosenthalBoxesNeeded > 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-[11px] text-brand-soft leading-relaxed">
                4× MERV-13 filters + 20&quot; box fan (~600 m³/h CADR per box). Drops room PM2.5 to{' '}
                <strong className="text-brand-deep">~{cadrSizing.projectedIndoorPm25WithCorsi} µg/m³</strong>.
              </p>
            </div>

            <div className="beige-inset rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-body">
                  Commercial True-HEPA
                </span>
                <span className="rounded-md bg-chip text-ink px-2 py-0.5 text-[11px] font-bold">
                  ~${cadrSizing.commercialEstimatedCostUsd} Total
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-ink">
                {cadrSizing.commercialHepaUnitsNeeded} Unit
                {cadrSizing.commercialHepaUnitsNeeded > 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted leading-relaxed">
                Required Room CADR: <strong>{cadrSizing.requiredCadrCubicMPerHour} m³/h</strong> ({cadrSizing.requiredCadrCfm} CFM) at medium quiet speed.
              </p>
            </div>
          </div>
        </div>

        <div className="beige-sand mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs text-ink-body">
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            DIY Savings:{' '}
            <strong className="text-brand-ink">${diySavings} saved</strong> for equal or higher MERV-13 fine-soot capture
          </span>
        </div>
      </div>
    );
  }
);
CadrSizingCard.displayName = 'CadrSizingCard';
