import React from 'react';
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Sun,
  Wind,
  Heart,
  Leaf,
  Info,
} from 'lucide-react';
import type { LocationAirQuality, RoutineOptimization } from '../types';
import {
  findOptimalVentilationWindows,
  WHO_24H_PM25_LIMIT,
} from '../domain/airQualityEngine';
import { SlideDeckContainer } from './SlideDeckContainer';
import { RevealOnScroll } from './RevealOnScroll';

interface RoutinePlannerProps {
  location: LocationAirQuality;
  routines: RoutineOptimization[];
  onToggleRoutine: (routineId: string) => void;
  onAdoptAllRoutines: () => void;
}

export const RoutinePlanner: React.FC<RoutinePlannerProps> = ({
  location,
  routines,
  onToggleRoutine,
  onAdoptAllRoutines,
}) => {
  const ventAnalysis = findOptimalVentilationWindows(location.hourlyForecast);
  const maxHourlyPm25 = Math.max(
    100,
    ...location.hourlyForecast.map((h) => h.pm25)
  );

  const totalDoseSavedUg = routines
    .filter((r) => r.isAdopted)
    .reduce((acc, r) => acc + r.personalPm25DoseSavedUg, 0);
  const totalCo2SavedKg = routines
    .filter((r) => r.isAdopted)
    .reduce((acc, r) => acc + r.co2eSavedKg, 0)
    .toFixed(2);
  const totalPmNoxSavedG = routines
    .filter((r) => r.isAdopted)
    .reduce((acc, r) => acc + r.localPollutantsSavedGrams, 0)
    .toFixed(1);

  return (
    <div className="space-y-6">
      {/* Container 1: 24-Hour Air Forecast & Best Window */}
      <div className="beige-panel hc-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#231D17] flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
              Best &amp; Worst Hours Outside Today ({location.city})
            </h2>
            <p className="mt-1 text-xs text-[#5C5246] sm:text-sm">
              Cold air traps smoke close to the ground in the morning and night. Green bars show the cleanest hours to open windows or step outside.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="beige-terracotta inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[#8F1D1D] font-medium">
              <ShieldAlert className="h-4 w-4 text-[#C43C35]" aria-hidden="true" />
              Avoid Outdoors: <strong>{ventAnalysis.worstTrapLabel}</strong> ({ventAnalysis.worstTrapAvgPm25} µg/m³)
            </span>
            <span className="beige-sage inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[#1B4D35] font-medium">
              <Sun className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
              Best Window: <strong>{ventAnalysis.bestWindowLabel}</strong> ({ventAnalysis.bestWindowAvgPm25} µg/m³)
            </span>
          </div>
        </div>

        {/* Accessible 24-Hour Bar & Threshold Visualization */}
        <div
          role="img"
          aria-label={`24-hour PM2.5 forecast chart for ${location.city}. Peak smog occurs around ${ventAnalysis.worstTrapLabel} at ${ventAnalysis.worstTrapAvgPm25} micrograms per cubic meter. Cleanest window is ${ventAnalysis.bestWindowLabel} at ${ventAnalysis.bestWindowAvgPm25} micrograms per cubic meter.`}
          className="beige-inset mt-5 rounded-xl p-4"
        >
          <div className="grid grid-cols-12 gap-1.5 sm:grid-cols-24 items-end h-44 pt-4">
            {location.hourlyForecast.map((point) => {
              const heightPct = Math.max(
                10,
                Math.min(100, Math.round((point.pm25 / maxHourlyPm25) * 100))
              );
              const isSafe = point.isSafeVentilationWindow;
              const isTrap = point.isInversionTrap;

              const barColor = isSafe
                ? 'bg-[#2D6A4F] hover:bg-[#1B4D35]'
                : isTrap
                  ? 'bg-[#C44536] hover:bg-[#9E2A2B]'
                  : 'bg-[#D4A359] hover:bg-[#B88438]';

              return (
                <div
                  key={`${location.id}-${point.hourIndex}`}
                  className="group relative flex flex-col items-center justify-end h-full"
                >
                  {/* Tooltip on Hover */}
                  <div className="pointer-events-none absolute -top-9 z-20 hidden rounded-lg bg-[#231D17] px-2.5 py-1 text-[10px] font-semibold text-[#FFFDF8] shadow-md group-hover:block whitespace-nowrap">
                    {point.hourLabel}: {point.pm25} µg/m³ | Wind {point.windSpeedKmh} km/h
                  </div>

                  <span className="mb-1 text-[9px] font-mono font-semibold text-[#6A5E50]">
                    {point.pm25}
                  </span>

                  <div
                    style={{
                      height: `${heightPct}%`,
                      animationDelay: `${point.hourIndex * 18}ms`,
                    }}
                    className={`animate-bar-rise w-full rounded-t-md transition-colors duration-300 ${barColor}`}
                  />

                  <span
                    className={`mt-1.5 text-[10px] font-mono ${
                      isSafe
                        ? 'font-extrabold text-[#1B4D35]'
                        : isTrap
                          ? 'font-bold text-[#9E2A2B]'
                          : 'text-[#6A5E50]'
                    }`}
                  >
                    {String(point.hourIndex).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2D6C2] pt-3 text-xs text-[#4E4439]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-sm bg-[#C44536]" aria-hidden="true" />
                Smog Peak (Keep windows closed)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-sm bg-[#D4A359]" aria-hidden="true" />
                Moderate Hours
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-sm bg-[#2D6A4F]" aria-hidden="true" />
                Best Hours (Open windows &amp; walk)
              </span>
            </div>
            <span className="text-[#5C5246]">
              Safe Limit: <strong>{WHO_24H_PM25_LIMIT} µg/m³</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Container 2: Routine Impact Summary Strip */}
      <RevealOnScroll delayMs={60}>
        <div className="beige-sage hc-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#163D2A] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
              What Your Daily Plan Protects
            </h3>
            <p className="text-xs text-[#2F523E]">
              Turn on simple timing swaps below to see how much soot your family avoids breathing each day.
            </p>
          </div>

          <div className="stagger-children flex flex-wrap items-center gap-3">
            <div className="hover-lift rounded-xl bg-[#FFFDF8] border border-[#BDD8C5] px-3.5 py-2 text-xs">
              <span className="text-[#5C5246] block font-medium">Soot Kept Out of Lungs</span>
              <span className="text-base font-extrabold text-[#1B4D35]">
                -{totalDoseSavedUg} µg / person / day
              </span>
            </div>
            <div className="hover-lift rounded-xl bg-[#FFFDF8] border border-[#BDD8C5] px-3.5 py-2 text-xs">
              <span className="text-[#5C5246] block font-medium">Pollution Prevented</span>
              <span className="text-base font-extrabold text-[#2B241D]">
                -{totalPmNoxSavedG}g smog &amp; -{totalCo2SavedKg}kg CO₂e
              </span>
            </div>
            <button
              type="button"
              onClick={onAdoptAllRoutines}
              className="rounded-xl bg-[#2D6A4F] px-4 py-2.5 text-xs font-bold text-[#FFFDF8] shadow-sm hover:bg-[#1B4D35] active:scale-95 transition"
            >
              Turn On All 5 Habits
            </button>
          </div>
        </div>
      </RevealOnScroll>

      {/* Container 3: Interactive Routine Slide Deck (Slide View or All View) */}
      <RevealOnScroll delayMs={100}>
        <SlideDeckContainer
          title="Your Step-by-Step Daily Schedule"
          subtitle="Flip through one habit at a time using Next / Previous, or click All (5) to view the whole day together."
          items={routines}
          getKey={(r) => r.id}
          getLabel={(r) => r.title.split(' ').slice(0, 3).join(' ')}
          defaultMode="slides"
          gridClassName="grid grid-cols-1 gap-4"
          renderSlide={(routine) => (
            <article
              className={`hc-card rounded-2xl border p-5 transition ${
                routine.isAdopted
                  ? 'border-[#9CCAB0] bg-[#FAFDFB]'
                  : 'border-[#E2D6C2] bg-[#FAF6EE]'
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="stagger-lines space-y-3.5 flex-1">
                  {/* Header & Tailored Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E6F1EA] border border-[#BDD8C5] px-3 py-0.5 text-xs font-bold text-[#1B4D35]">
                      {routine.tailoredForGroup}
                    </span>
                    <h4 className="text-base font-extrabold text-[#231D17] sm:text-lg">
                      {routine.title}
                    </h4>
                  </div>

                  {/* Before vs After Split Comparison Containers */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="beige-terracotta hover-lift rounded-xl p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A3412] block">
                        ✗ High-Smog / High-Emission Habit ({routine.baselineTimeLabel})
                      </span>
                      <p className="mt-1.5 text-xs text-[#4A261B] leading-relaxed">
                        {routine.baselineActivity}
                      </p>
                    </div>

                    <div className="beige-sage hover-lift rounded-xl p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B4D35] flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />✓ Smog-Smart Low-Emission Routine ({routine.recommendedTimeLabel})
                      </span>
                      <p className="mt-1.5 text-xs text-[#1D3B2B] font-semibold leading-relaxed">
                        {routine.recommendedActivity}
                      </p>
                    </div>
                  </div>

                  {/* Direct Impact Explanation Inset Container */}
                  <div className="beige-inset rounded-xl p-3.5 text-xs text-[#3E352B]">
                    <p className="flex items-start gap-2 leading-relaxed">
                      <Info
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#2D6A4F]"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="text-[#231D17]">Direct Impact Explained: </strong>
                        {routine.directImpactExplanation}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right Metric Column & Adopt Button */}
                <div className="flex flex-row items-center justify-between gap-3 lg:w-64 lg:flex-col lg:items-stretch lg:border-l lg:border-[#E2D6C2] lg:pl-5">
                  <div className="stagger-lines space-y-2 text-xs flex-1">
                    <div className="flex items-center justify-between rounded-xl bg-[#FFFDF8] px-3 py-2 border border-[#E5DAC8]">
                      <span className="flex items-center gap-1.5 text-[#5C5246] font-medium">
                        <Heart className="h-3.5 w-3.5 text-[#C44536]" aria-hidden="true" />
                        Lung Dose Cut:
                      </span>
                      <span className="font-extrabold text-[#1B4D35]">
                        -{routine.personalPm25DoseSavedUg} µg (-{routine.exposureReductionPct}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[#FFFDF8] px-3 py-2 border border-[#E5DAC8]">
                      <span className="flex items-center gap-1.5 text-[#5C5246] font-medium">
                        <Wind className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
                        Local PM/NOx:
                      </span>
                      <span className="font-extrabold text-[#2B241D]">
                        -{routine.localPollutantsSavedGrams} g/day
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[#FFFDF8] px-3 py-2 border border-[#E5DAC8]">
                      <span className="flex items-center gap-1.5 text-[#5C5246] font-medium">
                        <Leaf className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
                        Carbon Saved:
                      </span>
                      <span className="font-extrabold text-[#1B4D35]">
                        -{routine.co2eSavedKg} kg CO₂e
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleRoutine(routine.id)}
                    aria-pressed={routine.isAdopted}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold active:scale-95 transition ${
                      routine.isAdopted
                        ? 'bg-[#2D6A4F] text-[#FFFDF8] hover:bg-[#1B4D35] shadow-sm'
                        : 'border border-[#CBBBA3] bg-[#FFFDF8] text-[#2B241D] hover:bg-[#EFE7D9]'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{routine.isAdopted ? 'Adopted in Daily Plan' : 'Adopt This Routine'}</span>
                  </button>
                </div>
              </div>
            </article>
          )}
        />
      </RevealOnScroll>
    </div>
  );
};
