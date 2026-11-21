import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HourlyForecastChart } from '../components/HourlyForecastChart';
import { WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import { findOptimalVentilationWindows } from '../domain/airQualityEngine';

describe('HourlyForecastChart roving tabIndex keyboard accessibility', () => {
  it('exposes a single tab stop on the 24-hour chart and navigates hours via Arrow/Home/End keys', () => {
    const location = WINTER_SMOG_CITY_PRESETS[0];
    const vent = findOptimalVentilationWindows(location.hourlyForecast);

    const { container } = render(
      <HourlyForecastChart location={location} ventAnalysis={vent} />
    );

    const bars = Array.from(container.querySelectorAll<HTMLElement>('[tabindex][aria-label*="PM2.5"]'));
    expect(bars).toHaveLength(24);

    // Only the active hour has tabIndex=0 (roving tabIndex avoids 24 sequential Tab stops)
    expect(bars.filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(bars[0]).toHaveAttribute('tabindex', '0');

    bars[0].focus();
    fireEvent.keyDown(bars[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bars[1]);
    expect(bars[1]).toHaveAttribute('tabindex', '0');
    expect(bars[0]).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(bars[1], { key: 'End' });
    expect(document.activeElement).toBe(bars[23]);

    fireEvent.keyDown(bars[23], { key: 'Home' });
    expect(document.activeElement).toBe(bars[0]);

    fireEvent.keyDown(bars[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(bars[23]);
  });
});
