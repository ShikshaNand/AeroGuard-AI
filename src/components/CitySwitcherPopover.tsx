import React, { useRef } from 'react';
import { Search } from 'lucide-react';
import type { LocationAirQuality } from '../types';
import { WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import type { GeocodingResult } from '../services/openMeteoService';

interface CitySwitcherPopoverProps {
  currentCity: string;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  isSearching: boolean;
  searchResults: GeocodingResult[];
  onPickGeoResult: (geo: GeocodingResult) => void;
  onPickPreset: (preset: LocationAirQuality) => void;
}

/**
 * Accessible Global City Search & Winter Smog Preset Picker Popover
 * Implements WAI-ARIA `role="listbox"` with `role="option"` children and
 * ArrowDown / ArrowUp keyboard focus navigation from the search input into suggestions.
 */
export const CitySwitcherPopover: React.FC<CitySwitcherPopoverProps> = React.memo(
  ({
    currentCity,
    searchQuery,
    onChangeSearch,
    isSearching,
    searchResults,
    onPickGeoResult,
    onPickPreset,
  }) => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        e.preventDefault();
        optionRefs.current[0]?.focus();
      }
    };

    const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        optionRefs.current[(idx + 1) % searchResults.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx === 0) {
          searchInputRef.current?.focus();
        } else {
          optionRefs.current[idx - 1]?.focus();
        }
      }
    };

    return (
      <div className="beige-panel animate-drawer-enter absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl p-3 shadow-xl space-y-3">
        <div>
          <label htmlFor="city-search-input" className="block text-[11px] font-bold text-ink-muted mb-1.5">
            Search any city worldwide (Live Air Quality)
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              id="city-search-input"
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type city name (e.g. Delhi, London, Milan)..."
              className="w-full rounded-xl border border-line-strong bg-surface-soft py-2 pl-9 pr-3 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:bg-surface"
            />
          </div>

          {(searchResults.length > 0 || isSearching) && (
            <div
              role="listbox"
              aria-label="City search suggestions"
              className="mt-1.5 rounded-xl border border-line bg-surface p-1"
            >
              {isSearching ? (
                <p role="status" className="px-3 py-2 text-xs text-ink-subtle">
                  Searching cities...
                </p>
              ) : (
                searchResults.map((geo, idx) => (
                  <button
                    key={geo.id}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={currentCity === geo.name}
                    onClick={() => onPickGeoResult(geo)}
                    onKeyDown={(e) => handleOptionKeyDown(e, idx)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-chip"
                  >
                    <span className="font-semibold">
                      {geo.name}
                      {geo.admin1 ? `, ${geo.admin1}` : ''}
                    </span>
                    <span className="text-ink-subtle">{geo.country}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="border-t border-line-subtle pt-2.5">
          <span className="block text-[11px] font-bold text-ink-muted mb-2">
            Or try a Winter Smog City Preset:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {WINTER_SMOG_CITY_PRESETS.map((preset) => {
              const isSelected = currentCity === preset.city;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onPickPreset(preset)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition border ${
                    isSelected
                      ? 'bg-brand text-on-brand border-brand'
                      : 'bg-chip text-ink-body border-line hover:bg-chip-hover'
                  }`}
                >
                  <span className="truncate">{preset.city}</span>
                  <span className="text-[11px] opacity-90 ml-1 shrink-0">AQI {preset.usAqi}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);
CitySwitcherPopover.displayName = 'CitySwitcherPopover';
