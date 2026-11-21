import React, { useState, useMemo } from 'react';
import {
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Wind,
  Thermometer,
  Cigarette,
  AlertTriangle,
} from 'lucide-react';
import type { LocationAirQuality } from '../types';
import type { IndoorAirSimulationResult } from '../domain/iaqCalculator';
import {
  calculateCigaretteEquivalent,
  calculateWhoMultiple,
  determineInversionRisk,
  findOptimalVentilationWindows,
  getAQISeverityMetadata,
} from '../domain/airQualityEngine';

interface AirStatusHeroProps {
  location: LocationAirQuality;
  iaqSim: IndoorAirSimulationResult;
}

export const AirStatusHero: React.FC<AirStatusHeroProps> = React.memo(({
  location,
  iaqSim,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const severity = getAQISeverityMetadata(location.usAqi);
  const whoMultiple = calculateWhoMultiple(location.pm25);
  const cigsEq = calculateCigaretteEquivalent(location.pm25);
  const inversionRisk = determineInversionRisk(
    location.temperatureC,
    location.windSpeedKmh,
    location.pm25
  );
  const ventWindow = useMemo(
    () => findOptimalVentilationWindows(location.hourlyForecast),
    [location.hourlyForecast]
  );

  return (
    <section
      aria-label="Current Air Quality Overview"
      aria-live="polite"
      className="beige-panel rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Plain-Language Air Verdict (Reveals Line by Line) */}
        <div className="stagger-lines space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Air Outside Right Now · {location.city}, {location.country}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${severity.badgeClasses}`}
            >
              {severity.symbolCode}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {location.usAqi}
            </span>
            <div>
              <span className="text-base font-bold text-ink block">
                {severity.tier} Air Quality
              </span>
              <span className="text-xs text-ink-subtle">
                {whoMultiple}× above safe limit · Like breathing ≈ {cigsEq} cigarettes/day
              </span>
            </div>
          </div>

          <p className="text-sm text-ink-body leading-relaxed">
            <strong>What to do now:</strong> {severity.shortGuidance}
          </p>
        </div>

        {/* Right: 2 Crystal-Clear Action Containers (Staggered + Tactile Lift) */}
        <div className="stagger-children grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[440px] shrink-0">
          <div className="beige-sage hover-lift rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-brand-ink">
              <span>Safest Time to Go Out</span>
              <Clock className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-brand-deep">
              {ventWindow.bestWindowLabel}
            </p>
            <p className="mt-1 text-xs text-brand-soft leading-snug">
              Best time to open windows for 15 mins or take a short walk ({ventWindow.pm25ReductionPctByTiming}% cleaner than peak hours).
            </p>
          </div>

          <div className="beige-inset hover-lift rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-ink-secondary">
              <span>Inside Your Home</span>
              <ShieldCheck className="h-4 w-4 text-brand-ink" aria-hidden="true" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-ink">
                -{iaqSim.reductionPct}%
              </span>
              <span className="text-xs font-bold text-brand-ink">cleaner air</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted leading-snug">
              Your indoor hacks drop soot from {iaqSim.baselineIndoorPm25} to{' '}
              <strong>{iaqSim.optimizedIndoorPm25} µg/m³</strong> (saves {iaqSim.indoorCigarettesAvoidedPerDay} cigs/day).
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Friendly Health Note + Expandable Detailed Readings Toggle */}
      <div className="mt-4 flex flex-col gap-3 border-t border-line-subtle pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs text-ink-secondary">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warn-ink mt-0.5" aria-hidden="true" />
          <span>
            <strong>Family Care Note:</strong> {severity.sensitiveGroupWarning}
          </span>
        </p>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-chip px-3.5 py-1.5 text-xs font-bold text-ink-body hover:bg-chip-hover transition shrink-0 self-start sm:self-auto"
        >
          <span>{showDetails ? 'Hide Air Details' : 'See Detailed Readings (PM2.5, Wind)'}</span>
          {showDetails ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Optional Detailed Scientific Readings (Staggers In Card by Card) */}
      {showDetails && (
        <div className="stagger-children mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-line-subtle pt-4 text-xs">
          <div className="beige-inset rounded-xl p-3">
            <span className="text-ink-subtle font-semibold block">Fine Dust (PM2.5 &amp; PM10)</span>
            <p className="mt-1 text-base font-extrabold text-ink">
              {location.pm25} / {location.pm10} µg/m³
            </p>
            <span className="text-[11px] text-ink-subtle">WHO 24h safe limit: ≤ 15 µg/m³</span>
          </div>

          <div className="beige-inset rounded-xl p-3">
            <span className="text-ink-subtle font-semibold flex items-center gap-1">
              <Cigarette className="h-3.5 w-3.5 text-warn-ink" aria-hidden="true" />
              Traffic Gas (NO₂) &amp; Soot Load
            </span>
            <p className="mt-1 text-base font-extrabold text-ink">
              NO₂: {location.no2} µg/m³
            </p>
            <span className="text-[11px] text-ink-subtle">≈ {cigsEq} passive cigarettes/day</span>
          </div>

          <div className="beige-inset rounded-xl p-3">
            <span className="text-ink-subtle font-semibold flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              Weather &amp; Inversion Trap
            </span>
            <p className="mt-1 text-sm font-extrabold text-danger-warm">{inversionRisk}</p>
            <span className="text-[11px] text-ink-subtle">
              Temp: {location.temperatureC}°C · Wind: {location.windSpeedKmh} km/h · RH: {location.humidityPct}%
            </span>
          </div>

          <div className="beige-sand rounded-xl p-3">
            <span className="text-ink-secondary font-semibold flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              Why Smog Is High Here
            </span>
            <p className="mt-1 text-[11px] text-ink-body leading-relaxed">
              {location.dominantSmogSource}
            </p>
          </div>
        </div>
      )}
    </section>
  );
});
AirStatusHero.displayName = 'AirStatusHero';
