import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Search,
  MapPin,
  Sun,
  Moon,
  KeyRound,
  Users,
  ChevronDown,
} from 'lucide-react';
import type { FamilyProfile, LocationAirQuality } from '../types';
import type { ThemeMode } from '../utils/storage';
import { WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import {
  fetchLiveAirQualityForCoords,
  searchCities,
  type GeocodingResult,
} from '../services/openMeteoService';
import { sanitizeTextInput, validateGeminiApiKeyFormat } from '../utils/security';
import { ApiKeyDrawer } from './ApiKeyDrawer';

interface HeaderBannerProps {
  location: LocationAirQuality;
  onSelectLocation: (loc: LocationAirQuality) => void;
  profile: FamilyProfile;
  showFamilyDrawer: boolean;
  onToggleFamilyDrawer: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  sessionApiKey: string;
  onSaveSessionApiKey: (key: string) => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  location,
  onSelectLocation,
  profile,
  showFamilyDrawer,
  onToggleFamilyDrawer,
  theme,
  onToggleTheme,
  sessionApiKey,
  onSaveSessionApiKey,
}) => {
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInputDraft, setKeyInputDraft] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const cityTriggerRef = useRef<HTMLButtonElement>(null);
  const keyTriggerRef = useRef<HTMLButtonElement>(null);

  // Close city dropdown on outside click and close overlays on Escape key with focus restoration
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setCityMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (cityMenuOpen) {
          setCityMenuOpen(false);
          cityTriggerRef.current?.focus();
        }
        if (showKeyModal) {
          setShowKeyModal(false);
          setKeyError(null);
          keyTriggerRef.current?.focus();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cityMenuOpen, showKeyModal]);

  const trimmedSearchQuery = sanitizeTextInput(searchQuery, 60);

  // Debounced geocoding city search
  useEffect(() => {
    if (trimmedSearchQuery.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCities(trimmedSearchQuery);
        if (!cancelled) {
          setSearchResults(results);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedSearchQuery]);

  const visibleSearchResults = trimmedSearchQuery.length >= 2 ? searchResults : [];

  const handlePickGeoResult = async (geo: GeocodingResult) => {
    setIsLoadingCity(true);
    setSearchQuery('');
    setSearchResults([]);
    setCityMenuOpen(false);
    try {
      const liveLoc = await fetchLiveAirQualityForCoords(
        geo.name,
        geo.country,
        geo.latitude,
        geo.longitude
      );
      onSelectLocation(liveLoc);
    } finally {
      setIsLoadingCity(false);
    }
  };

  const handlePickPreset = (preset: LocationAirQuality) => {
    onSelectLocation(preset);
    setCityMenuOpen(false);
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateGeminiApiKeyFormat(keyInputDraft);
    if (!check.isValid) {
      setKeyError(check.reason ?? 'Invalid API key format.');
      return;
    }
    setKeyError(null);
    onSaveSessionApiKey(keyInputDraft.trim());
    setKeyInputDraft('');
    setShowKeyModal(false);
    keyTriggerRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-header backdrop-blur-md">
      {/* WCAG 2.1 AA Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-on-brand"
      >
        Skip to main content
      </a>

      <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Clean Brand Identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm"
              aria-hidden="true"
            >
              <Wind className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-ink leading-tight">
                AeroGuard AI
              </h1>
              <p className="text-xs text-ink-subtle hidden sm:block">
                Family Clean-Air &amp; Winter Smog Guide
              </p>
            </div>
          </div>

          {/* Center: Clean City Switcher Dropdown (Live Search + Popular Cities) */}
          <div ref={cityDropdownRef} className="relative flex-1 max-w-sm">
            <button
              ref={cityTriggerRef}
              type="button"
              onClick={() => setCityMenuOpen((prev) => !prev)}
              aria-expanded={cityMenuOpen}
              aria-label="Change city or search location"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-left text-xs shadow-xs hover:border-brand transition"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden="true" />
                <span className="font-bold text-ink truncate">
                  {location.city}, {location.country}
                </span>
                <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] font-semibold text-ink-muted shrink-0">
                  {isLoadingCity ? 'Updating...' : location.isLiveApi ? 'Live' : 'Preset'}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${
                  cityMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown Popover: Search any city OR pick a winter smog hotspot */}
            {cityMenuOpen && (
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
                      id="city-search-input"
                      type="search"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type city name (e.g. Delhi, London, Milan)..."
                      className="w-full rounded-xl border border-line-strong bg-surface-soft py-2 pl-9 pr-3 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:bg-surface"
                    />
                  </div>

                  {(visibleSearchResults.length > 0 || isSearching) && (
                    <div
                      role="listbox"
                      aria-label="City search suggestions"
                      className="mt-1.5 rounded-xl border border-line bg-surface p-1"
                    >
                      {isSearching ? (
                        <p className="px-3 py-2 text-xs text-ink-subtle">Searching cities...</p>
                      ) : (
                        visibleSearchResults.map((geo) => (
                          <button
                            key={geo.id}
                            type="button"
                            onClick={() => handlePickGeoResult(geo)}
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
                      const isSelected = location.city === preset.city;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePickPreset(preset)}
                          aria-pressed={isSelected}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition border ${
                            isSelected
                              ? 'bg-brand text-on-brand border-brand'
                              : 'bg-chip text-ink-body border-line hover:bg-chip-hover'
                          }`}
                        >
                          <span className="truncate">{preset.city}</span>
                          <span className="text-[10px] opacity-85 ml-1 shrink-0">
                            AQI {preset.usAqi}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: 3 Simple Utility Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleFamilyDrawer}
              aria-expanded={showFamilyDrawer}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                showFamilyDrawer
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line-strong bg-surface text-ink hover:bg-chip'
              }`}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>My Family ({profile.householdSize})</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Switch to Light Beige theme' : 'Switch to Warm Dark theme'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-secondary hover:bg-chip active:scale-95 transition"
              title={theme === 'dark' ? 'Switch to Light Beige Theme' : 'Switch to Warm Dark Theme'}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </span>
            </button>

            <button
              ref={keyTriggerRef}
              type="button"
              onClick={() => {
                setShowKeyModal((prev) => !prev);
                setKeyError(null);
              }}
              aria-expanded={showKeyModal}
              aria-label="Configure optional Gemini API key"
              title="Optional: Connect your own Gemini API key"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-secondary hover:bg-chip"
            >
              <KeyRound className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              <span className="hidden lg:inline">
                {sessionApiKey ? 'Gemini Connected' : 'AI Settings'}
              </span>
            </button>
          </div>
        </div>

        {/* Optional In-Memory API Key Drawer */}
        {showKeyModal && (
          <ApiKeyDrawer
            sessionApiKey={sessionApiKey}
            keyInputDraft={keyInputDraft}
            keyError={keyError}
            onChangeDraft={setKeyInputDraft}
            onSubmit={handleSaveKey}
            onClearKey={() => onSaveSessionApiKey('')}
            onClose={() => {
              setShowKeyModal(false);
              setKeyError(null);
              keyTriggerRef.current?.focus();
            }}
          />
        )}
      </div>
    </header>
  );
};
