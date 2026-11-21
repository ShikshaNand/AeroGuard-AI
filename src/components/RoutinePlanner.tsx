import React, { useMemo } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Wind,
  Heart,
  Leaf,
  Info,
} from 'lucide-react';
import type { LocationAirQuality, RoutineOptimization } from '../types';
import { findOptimalVentilationWindows } from '../domain/airQualityEngine';
import { HourlyForecastChart } from './HourlyForecastChart';
import { SlideDeckContainer } from './SlideDeckContainer';
import { RevealOnScroll } from './RevealOnScroll';

interface RoutinePlannerProps {
  location: LocationAirQuality;
  routines: RoutineOptimization[];
  onToggleRoutine: (routineId: string) => void;
  onAdoptAllRoutines: () => void;
}

export const RoutinePlanner: React.FC<RoutinePlannerProps> = React.memo(({
  location,
  routines,
  onToggleRoutine,
  onAdoptAllRoutines,
}) => {
  const ventAnalysis = useMemo(
    () => findOptimalVentilationWindows(location.hourlyForecast),
    [location.hourlyForecast]
  );

  const { totalDoseSavedUg, totalCo2SavedKg, totalPmNoxSavedG } = useMemo(() => {
    const adopted = routines.filter((r) => r.isAdopted);
    return {
      totalDoseSavedUg: adopted.reduce((acc, r) => acc + r.personalPm25DoseSavedUg, 0),
      totalCo2SavedKg: adopted.reduce((acc, r) => acc + r.co2eSavedKg, 0).toFixed(2),
      totalPmNoxSavedG: adopted.reduce((acc, r) => acc + r.localPollutantsSavedGrams, 0).toFixed(1),
    };
  }, [routines]);

  return (
    <div className="space-y-6">
      {/* Container 1: 24-Hour Air Forecast & Best Window */}
      <HourlyForecastChart location={location} ventAnalysis={ventAnalysis} />

      {/* Container 2: Routine Impact Summary Strip */}
      <RevealOnScroll delayMs={60}>
        <div className="beige-sage flex flex-col gap-4 rounded-2xl p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-brand-deep flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-ink" aria-hidden="true" />
              What Your Daily Plan Protects
            </h3>
            <p className="text-xs text-brand-soft">
              Turn on simple timing swaps below to see how much soot your family avoids breathing each day.
            </p>
          </div>

          <div className="stagger-children flex flex-wrap items-center gap-3">
            <div className="hover-lift rounded-xl bg-surface border border-sage-line px-3.5 py-2 text-xs">
              <span className="text-ink-muted block font-medium">Soot Kept Out of Lungs</span>
              <span className="text-base font-extrabold text-brand-ink">
                -{totalDoseSavedUg} µg / person / day
              </span>
            </div>
            <div className="hover-lift rounded-xl bg-surface border border-sage-line px-3.5 py-2 text-xs">
              <span className="text-ink-muted block font-medium">Pollution Prevented</span>
              <span className="text-base font-extrabold text-ink">
                -{totalPmNoxSavedG}g smog &amp; -{totalCo2SavedKg}kg CO₂e
              </span>
            </div>
            <button
              type="button"
              onClick={onAdoptAllRoutines}
              className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-on-brand shadow-sm hover:bg-brand-hover active:scale-95 transition"
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
              className={`rounded-2xl border p-5 transition ${
                routine.isAdopted
                  ? 'border-sage-line-strong bg-surface-active'
                  : 'border-line bg-surface-soft'
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="stagger-lines space-y-3.5 flex-1">
                  {/* Header & Tailored Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sage-pill border border-sage-line px-3 py-0.5 text-xs font-bold text-brand-ink">
                      {routine.tailoredForGroup}
                    </span>
                    <h4 className="text-base font-extrabold text-ink sm:text-lg">
                      {routine.title}
                    </h4>
                  </div>

                  {/* Before vs After Split Comparison Containers */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="beige-terracotta hover-lift rounded-xl p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-danger-warm block">
                        ✗ High-Smog / High-Emission Habit ({routine.baselineTimeLabel})
                      </span>
                      <p className="mt-1.5 text-xs text-danger-body leading-relaxed">
                        {routine.baselineActivity}
                      </p>
                    </div>

                    <div className="beige-sage hover-lift rounded-xl p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-ink flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />✓ Smog-Smart Low-Emission Routine ({routine.recommendedTimeLabel})
                      </span>
                      <p className="mt-1.5 text-xs text-brand-soft font-semibold leading-relaxed">
                        {routine.recommendedActivity}
                      </p>
                    </div>
                  </div>

                  {/* Direct Impact Explanation Inset Container */}
                  <div className="beige-inset rounded-xl p-3.5 text-xs text-ink-body">
                    <p className="flex items-start gap-2 leading-relaxed">
                      <Info
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="text-ink">Direct Impact Explained: </strong>
                        {routine.directImpactExplanation}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right Metric Column & Adopt Button */}
                <div className="flex flex-row items-center justify-between gap-3 lg:w-64 lg:flex-col lg:items-stretch lg:border-l lg:border-line lg:pl-5">
                  <div className="stagger-lines space-y-2 text-xs flex-1">
                    <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 border border-line">
                      <span className="flex items-center gap-1.5 text-ink-muted font-medium">
                        <Heart className="h-3.5 w-3.5 text-danger-ink" aria-hidden="true" />
                        Lung Dose Cut:
                      </span>
                      <span className="font-extrabold text-brand-ink">
                        -{routine.personalPm25DoseSavedUg} µg (-{routine.exposureReductionPct}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 border border-line">
                      <span className="flex items-center gap-1.5 text-ink-muted font-medium">
                        <Wind className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                        Local PM/NOx:
                      </span>
                      <span className="font-extrabold text-ink">
                        -{routine.localPollutantsSavedGrams} g/day
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 border border-line">
                      <span className="flex items-center gap-1.5 text-ink-muted font-medium">
                        <Leaf className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                        Carbon Saved:
                      </span>
                      <span className="font-extrabold text-brand-ink">
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
                        ? 'bg-brand text-on-brand hover:bg-brand-hover shadow-sm'
                        : 'border border-line-strong bg-surface text-ink hover:bg-chip'
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
});
RoutinePlanner.displayName = 'RoutinePlanner';
