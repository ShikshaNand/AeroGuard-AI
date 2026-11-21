import React from 'react';
import type { LocationAirQuality } from '../types';
import type { AQISeverityMetadata } from '../domain/airQualityEngine';

interface CompactContextBarProps {
  location: LocationAirQuality;
  severity: AQISeverityMetadata;
  bestVentWindow: string;
  optimizedIndoorPm25: number;
}

/**
 * Single-line atmospheric context summary bar rendered above secondary tabs.
 */
export const CompactContextBar: React.FC<CompactContextBarProps> = React.memo(
  ({ location, severity, bestVentWindow, optimizedIndoorPm25 }) => (
    <div className="beige-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl px-5 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-extrabold text-ink">
          {location.city}, {location.country}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severity.badgeClasses}`}
        >
          AQI {location.usAqi} · {severity.symbolCode}
        </span>
      </div>
      <span className="text-ink-secondary">
        Best outdoor window:{' '}
        <strong className="text-brand-ink">{bestVentWindow}</strong> · Indoor air:{' '}
        <strong className="text-brand-ink">{optimizedIndoorPm25} µg/m³</strong>
      </span>
    </div>
  )
);
CompactContextBar.displayName = 'CompactContextBar';
