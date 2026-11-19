import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Search,
  MapPin,
  Sun,
  Moon,
  KeyRound,
  Sparkles,
  Check,
  X,
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
import { maskApiKey, sanitizeTextInput } from '../utils/security';

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
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setCityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocoding city search
  useEffect(() => {
    const trimmed = sanitizeTextInput(searchQuery, 60);
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCities(trimmed);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    onSaveSessionApiKey(keyInputDraft.trim());
    setKeyInputDraft('');
    setShowKeyModal(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5DAC8] bg-[#FAF6EE]/95 backdrop-blur-md">
      {/* WCAG 2.1 AA Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#2D6A4F] focus:px-4 focus:py-2 focus:font-bold focus:text-[#FFFDF8]"
      >
        Skip to main content
      </a>

      <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Clean Brand Identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2D6A4F] text-[#FFFDF8] shadow-sm"
              aria-hidden="true"
            >
              <Wind className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-[#231D17] leading-tight">
                AeroGuard AI
              </h1>
              <p className="text-xs text-[#6A5E50] hidden sm:block">
                Family Clean-Air &amp; Winter Smog Guide
              </p>
            </div>
          </div>

          {/* Center: Clean City Switcher Dropdown (Live Search + Popular Cities) */}
          <div ref={cityDropdownRef} className="relative flex-1 max-w-sm">
            <button
              type="button"
              onClick={() => setCityMenuOpen((prev) => !prev)}
              aria-expanded={cityMenuOpen}
              aria-label="Change city or search location"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#DDD0BC] bg-[#FFFDF8] px-3.5 py-2 text-left text-xs shadow-xs hover:border-[#2D6A4F] transition"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 shrink-0 text-[#2D6A4F]" aria-hidden="true" />
                <span className="font-bold text-[#231D17] truncate">
                  {location.city}, {location.country}
                </span>
                <span className="rounded-full bg-[#EFE7D9] px-2 py-0.5 text-[10px] font-semibold text-[#5C5246] shrink-0">
                  {isLoadingCity ? 'Updating...' : location.isLiveApi ? 'Live' : 'Preset'}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#6A5E50] transition-transform ${
                  cityMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown Popover: Search any city OR pick a winter smog hotspot */}
            {cityMenuOpen && (
              <div className="beige-panel animate-drawer-enter absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl p-3 shadow-xl space-y-3">
                <div>
                  <label htmlFor="city-search-input" className="block text-[11px] font-bold text-[#5C5246] mb-1.5">
                    Search any city worldwide (Live Air Quality)
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A6E60]"
                      aria-hidden="true"
                    />
                    <input
                      id="city-search-input"
                      type="search"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type city name (e.g. Delhi, London, Milan)..."
                      className="w-full rounded-xl border border-[#D8CBB6] bg-[#FAF6EE] py-2 pl-9 pr-3 text-xs text-[#2B241D] placeholder-[#8A7D6D] focus:border-[#2D6A4F] focus:bg-[#FFFDF8]"
                    />
                  </div>

                  {(searchResults.length > 0 || isSearching) && (
                    <div
                      role="listbox"
                      aria-label="City search suggestions"
                      className="mt-1.5 rounded-xl border border-[#E5DAC8] bg-[#FFFDF8] p-1"
                    >
                      {isSearching ? (
                        <p className="px-3 py-2 text-xs text-[#6A5E50]">Searching cities...</p>
                      ) : (
                        searchResults.map((geo) => (
                          <button
                            key={geo.id}
                            type="button"
                            onClick={() => handlePickGeoResult(geo)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-[#2B241D] hover:bg-[#EFE7D9]"
                          >
                            <span className="font-semibold">
                              {geo.name}
                              {geo.admin1 ? `, ${geo.admin1}` : ''}
                            </span>
                            <span className="text-[#6A5E50]">{geo.country}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#ECE2D0] pt-2.5">
                  <span className="block text-[11px] font-bold text-[#5C5246] mb-2">
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
                              ? 'bg-[#2D6A4F] text-[#FFFDF8] border-[#2D6A4F]'
                              : 'bg-[#F6F0E4] text-[#3B3228] border-[#E5DAC8] hover:bg-[#EAE0CE]'
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
                  ? 'border-[#2D6A4F] bg-[#2D6A4F] text-[#FFFDF8]'
                  : 'border-[#DDD0BC] bg-[#FFFDF8] text-[#2B241D] hover:bg-[#EFE7D9]'
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD0BC] bg-[#FFFDF8] px-3 py-2 text-xs font-semibold text-[#4E4439] hover:bg-[#EFE7D9] active:scale-95 transition"
              title={theme === 'dark' ? 'Switch to Light Beige Theme' : 'Switch to Warm Dark Theme'}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowKeyModal((prev) => !prev)}
              aria-expanded={showKeyModal}
              aria-label="Configure optional Gemini API key"
              title="Optional: Connect your own Gemini API key"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD0BC] bg-[#FFFDF8] px-3 py-2 text-xs font-semibold text-[#4E4439] hover:bg-[#EFE7D9]"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
              <span className="hidden lg:inline">
                {sessionApiKey ? 'Gemini Connected' : 'AI Settings'}
              </span>
            </button>
          </div>
        </div>

        {/* Optional In-Memory API Key Drawer */}
        {showKeyModal && (
          <form
            onSubmit={handleSaveKey}
            aria-label="Configure optional Gemini API key"
            className="beige-sage animate-drawer-enter mt-3 rounded-xl p-3.5 text-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-bold text-[#1B4D35] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Optional: Connect Live Google Gemini AI
                </p>
                <p className="text-[#3A4A40]">
                  The assistant already works right away using our built-in science engine. If you have a Gemini API key, paste it here (kept only in memory for this session).
                </p>
                {sessionApiKey && (
                  <p className="text-[#1B4D35] font-semibold">
                    Active session key: <code>{maskApiKey(sessionApiKey)}</code>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="gemini-key-input" className="sr-only">
                  Gemini API Key
                </label>
                <input
                  id="gemini-key-input"
                  type="password"
                  autoComplete="off"
                  value={keyInputDraft}
                  onChange={(e) => setKeyInputDraft(e.target.value)}
                  placeholder="Paste Gemini API key..."
                  className="rounded-lg border border-[#BDD8C5] bg-[#FFFDF8] px-3 py-1.5 text-xs text-[#2B241D]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#2D6A4F] px-3 py-1.5 font-semibold text-[#FFFDF8] hover:bg-[#1B4D35]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save
                </button>
                {sessionApiKey && (
                  <button
                    type="button"
                    onClick={() => onSaveSessionApiKey('')}
                    className="rounded-lg border border-[#D89A8E] bg-[#FDF1EC] px-2.5 py-1.5 text-[#8F1D1D] font-semibold hover:bg-[#F9DFD7]"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  aria-label="Close AI settings panel"
                  className="rounded-lg p-1.5 text-[#5C5246] hover:text-[#231D17]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </header>
  );
};
