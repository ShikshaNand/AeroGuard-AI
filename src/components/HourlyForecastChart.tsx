import React, { useMemo, useRef, useState } from 'react';
import { Clock, ShieldAlert, Sun } from 'lucide-react';
import type { LocationAirQuality } from '../types';
import {
  WHO_24H_PM25_LIMIT,
  type VentilationWindowAnalysis,
} from '../domain/airQualityEngine';

interface HourlyForecastChartProps {
  location: LocationAirQuality;
  ventAnalysis: VentilationWindowAnalysis;
}

/**
 * Keyboard-Accessible 24-Hour Winter Thermal Inversion Bar Chart
 * Implements a WAI-ARIA roving tabIndex so Tab crosses the chart in a single stop
 * while ArrowLeft / ArrowRight / Home / End inspect all 24 individual hours.
 */
export const HourlyForecastChart: React.FC<HourlyForecastChartProps> = React.memo(
  ({ location, ventAnalysis }) => {
    const [focusedHour, setFocusedHour] = useState(0);
    const barRefs = useRef<Array<HTMLDivElement | null>>([]);

    const maxHourlyPm25 = useMemo(
      () => Math.max(100, ...location.hourlyForecast.map((h) => h.pm25)),
      [location.hourlyForecast]
    );

    const handleBarKeyDown = (e: React.KeyboardEvent, idx: number) => {
      const total = location.hourlyForecast.length;
      if (total === 0) return;

      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % total;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + total) % total;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = total - 1;

      if (nextIdx !== null) {
        e.preventDefault();
        setFocusedHour(nextIdx);
        barRefs.current[nextIdx]?.focus();
      }
    };

    return (
      <div className="beige-panel rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-ink" aria-hidden="true" />
              Best &amp; Worst Hours Outside Today ({location.city})
            </h2>
            <p className="mt-1 text-xs text-ink-muted sm:text-sm">
              Cold air traps smoke close to the ground in the morning and night. Green bars show the cleanest hours to open windows or step outside.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="beige-terracotta inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-danger-ink font-medium">
              <ShieldAlert className="h-4 w-4 text-danger-ink" aria-hidden="true" />
              Avoid Outdoors: <strong>{ventAnalysis.worstTrapLabel}</strong> ({ventAnalysis.worstTrapAvgPm25} µg/m³)
            </span>
            <span className="beige-sage inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-brand-ink font-medium">
              <Sun className="h-4 w-4 text-brand-ink" aria-hidden="true" />
              Best Window: <strong>{ventAnalysis.bestWindowLabel}</strong> ({ventAnalysis.bestWindowAvgPm25} µg/m³)
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-roledescription="interactive chart"
          aria-label={`24-hour PM2.5 forecast chart for ${location.city}. Peak smog occurs around ${ventAnalysis.worstTrapLabel} at ${ventAnalysis.worstTrapAvgPm25} micrograms per cubic meter. Cleanest window is ${ventAnalysis.bestWindowLabel} at ${ventAnalysis.bestWindowAvgPm25} micrograms per cubic meter. Use Left and Right arrow keys to inspect each hour.`}
          className="beige-inset mt-5 rounded-xl p-4"
        >
          <div className="grid grid-cols-12 gap-1.5 sm:grid-cols-24 items-end h-44 pt-4">
            {location.hourlyForecast.map((point, idx) => {
              const heightPct = Math.max(
                10,
                Math.min(100, Math.round((point.pm25 / maxHourlyPm25) * 100))
              );
              const isSafe = point.isSafeVentilationWindow;
              const isTrap = point.isInversionTrap;
              const barColor = isSafe
                ? 'bg-brand hover:bg-brand-hover'
                : isTrap
                  ? 'bg-danger hover:bg-danger-hover'
                  : 'bg-warn hover:bg-warn-hover';

              return (
                <div
                  key={`${location.id}-${point.hourIndex}`}
                  ref={(el) => {
                    barRefs.current[idx] = el;
                  }}
                  tabIndex={focusedHour === idx ? 0 : -1}
                  onFocus={() => setFocusedHour(idx)}
                  onKeyDown={(e) => handleBarKeyDown(e, idx)}
                  aria-label={`${point.hourLabel}: PM2.5 ${point.pm25} micrograms per cubic meter, wind ${point.windSpeedKmh} kilometers per hour${isSafe ? ', best ventilation window' : isTrap ? ', smog peak' : ''}`}
                  className="group relative flex flex-col items-center justify-end h-full rounded-sm focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <div className="pointer-events-none absolute -top-9 z-20 hidden rounded-lg bg-tooltip px-2.5 py-1 text-[11px] font-semibold text-on-brand shadow-md group-hover:block group-focus:block whitespace-nowrap">
                    {point.hourLabel}: {point.pm25} µg/m³ | Wind {point.windSpeedKmh} km/h
                  </div>

                  <span className="mb-1 text-[11px] font-mono font-semibold text-ink-subtle">
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
                    className={`mt-1.5 text-[11px] font-mono ${
                      isSafe
                        ? 'font-extrabold text-brand-ink'
                        : isTrap
                          ? 'font-bold text-danger-ink'
                          : 'text-ink-subtle'
                    }`}
                  >
                    {String(point.hourIndex).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-sm bg-danger" aria-hidden="true" />
                Smog Peak (Keep windows closed)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-sm bg-warn" aria-hidden="true" />
                Moderate Hours
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-sm bg-brand" aria-hidden="true" />
                Best Hours (Open windows &amp; walk)
              </span>
            </div>
            <span className="text-ink-muted">
              Safe Limit: <strong>{WHO_24H_PM25_LIMIT} µg/m³</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }
);
HourlyForecastChart.displayName = 'HourlyForecastChart';
