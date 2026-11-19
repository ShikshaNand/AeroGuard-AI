import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Home,
  Leaf,
  Bot,
  ShieldAlert,
  Users,
  Minus,
  Plus,
} from 'lucide-react';
import type { FamilyProfile, LocationAirQuality } from './types';
import {
  IAQ_HACKS_CATALOGUE,
  SUSTAINABLE_ALTERNATIVES_CATALOGUE,
} from './data/smogPresets';
import {
  clearPersistedState,
  getDefaultPersistedState,
  loadPersistedState,
  savePersistedState,
  type PersistedTabId,
  type ThemeMode,
} from './utils/storage';
import {
  calculateCadrAndCorsiSizing,
  simulateIndoorAirQuality,
} from './domain/iaqCalculator';
import {
  calculateAggregateImpact,
  generateTailoredDailyRoutines,
} from './domain/impactCalculator';
import {
  findOptimalVentilationWindows,
  getAQISeverityMetadata,
} from './domain/airQualityEngine';
import {
  adjustMemberCount as applyMemberDelta,
  type MemberCountField,
} from './domain/familyMembers';
import { HeaderBanner } from './components/HeaderBanner';
import { AirStatusHero } from './components/AirStatusHero';
import { FamilyProfileBar } from './components/FamilyProfileBar';
import { RoutinePlanner } from './components/RoutinePlanner';
import { IndoorAirHacks } from './components/IndoorAirHacks';
import { SustainableSwaps } from './components/SustainableSwaps';
import { AiSmogAssistant } from './components/AiSmogAssistant';

type ActiveTabId = PersistedTabId;

interface TabDefinition {
  id: ActiveTabId;
  label: string;
  helper: string;
  icon: React.ReactNode;
}

export function App() {
  const [initialState] = useState(() => loadPersistedState());

  const [location, setLocation] = useState<LocationAirQuality>(initialState.location);
  const [profile, setProfile] = useState<FamilyProfile>(initialState.profile);
  const [activeTab, setActiveTab] = useState<ActiveTabId>(initialState.activeTab);
  const [showFamilyDrawer, setShowFamilyDrawer] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(initialState.theme);
  // SECURITY: API key is kept strictly in volatile RAM and never persisted to localStorage
  const [sessionApiKey, setSessionApiKey] = useState('');

  // Adopted Low-Emission Daily Routines
  const [adoptedRoutineIds, setAdoptedRoutineIds] = useState<Set<string>>(
    () => new Set(initialState.adoptedRoutineIds)
  );

  // Active Indoor Air Quality Hacks
  const [activeHackIds, setActiveHackIds] = useState<Set<string>>(
    () => new Set(initialState.activeHackIds)
  );

  // Selected Sustainable Lifestyle Swaps
  const [selectedSwapIds, setSelectedSwapIds] = useState<Set<string>>(
    () => new Set(initialState.selectedSwapIds)
  );

  const [targetAch, setTargetAch] = useState(initialState.targetAch);
  const [communityHouseholdsCount, setCommunityHouseholdsCount] = useState(
    initialState.communityHouseholdsCount
  );

  // Auto-save user data safely to localStorage so nothing is lost on page refresh
  useEffect(() => {
    savePersistedState({
      profile,
      location,
      adoptedRoutineIds: Array.from(adoptedRoutineIds),
      activeHackIds: Array.from(activeHackIds),
      selectedSwapIds: Array.from(selectedSwapIds),
      targetAch,
      communityHouseholdsCount,
      theme,
      activeTab,
    });
  }, [
    profile,
    location,
    adoptedRoutineIds,
    activeHackIds,
    selectedSwapIds,
    targetAch,
    communityHouseholdsCount,
    theme,
    activeTab,
  ]);

  const handleResetDefaults = () => {
    clearPersistedState();
    const defaults = getDefaultPersistedState();
    setProfile(defaults.profile);
    setLocation(defaults.location);
    setAdoptedRoutineIds(new Set(defaults.adoptedRoutineIds));
    setActiveHackIds(new Set(defaults.activeHackIds));
    setSelectedSwapIds(new Set(defaults.selectedSwapIds));
    setTargetAch(defaults.targetAch);
    setCommunityHouseholdsCount(defaults.communityHouseholdsCount);
    setTheme(defaults.theme);
    setActiveTab(defaults.activeTab);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  // Quick member adjustment helper for sidebar + family drawer
  const adjustMemberCount = (field: MemberCountField, delta: number) => {
    setProfile((prev) => applyMemberDelta(prev, field, delta));
  };

  // Memoized Domain Computations
  const routines = useMemo(
    () => generateTailoredDailyRoutines(location, profile, adoptedRoutineIds),
    [location, profile, adoptedRoutineIds]
  );

  const activeHacksList = useMemo(
    () => IAQ_HACKS_CATALOGUE.filter((h) => activeHackIds.has(h.id)),
    [activeHackIds]
  );

  const iaqSim = useMemo(
    () => simulateIndoorAirQuality(location.pm25, profile, activeHacksList),
    [location.pm25, profile, activeHacksList]
  );

  const cadrSizing = useMemo(
    () =>
      calculateCadrAndCorsiSizing(
        profile.mainRoomAreaSqM,
        profile.ceilingHeightM,
        location.pm25,
        targetAch
      ),
    [profile.mainRoomAreaSqM, profile.ceilingHeightM, location.pm25, targetAch]
  );

  const selectedSwapsList = useMemo(
    () =>
      SUSTAINABLE_ALTERNATIVES_CATALOGUE.filter((s) => selectedSwapIds.has(s.id)),
    [selectedSwapIds]
  );

  const impactSummary = useMemo(
    () =>
      calculateAggregateImpact(
        routines,
        selectedSwapsList,
        communityHouseholdsCount,
        profile.householdSize
      ),
    [routines, selectedSwapsList, communityHouseholdsCount, profile.householdSize]
  );

  const severity = useMemo(
    () => getAQISeverityMetadata(location.usAqi),
    [location.usAqi]
  );

  const ventWindow = useMemo(
    () => findOptimalVentilationWindows(location.hourlyForecast),
    [location.hourlyForecast]
  );

  const handleToggleRoutine = (routineId: string) => {
    setAdoptedRoutineIds((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const handleAdoptAllRoutines = () => {
    setAdoptedRoutineIds(new Set(routines.map((r) => r.id)));
  };

  const handleToggleHack = (hackId: string) => {
    setActiveHackIds((prev) => {
      const next = new Set(prev);
      if (next.has(hackId)) {
        next.delete(hackId);
      } else {
        next.add(hackId);
      }
      return next;
    });
  };

  const handleToggleSwap = (swapId: string) => {
    setSelectedSwapIds((prev) => {
      const next = new Set(prev);
      if (next.has(swapId)) {
        next.delete(swapId);
      } else {
        next.add(swapId);
      }
      return next;
    });
  };

  const tabs: TabDefinition[] = [
    {
      id: 'routines',
      label: 'Daily Plan & Air Hours',
      helper: 'When to go out & ventilate',
      icon: <Clock className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'iaq-hacks',
      label: 'Clean Indoor Air',
      helper: 'Home hacks & DIY filter guide',
      icon: <Home className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'sustainable-swaps',
      label: 'Eco Swaps & Community',
      helper: 'Neighborhood impact & pledge',
      icon: <Leaf className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'ai-assistant',
      label: 'Ask AeroGuard AI',
      helper: 'Personal clean-air coach',
      icon: <Bot className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveTab(tabs[(idx + 1) % tabs.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    }
  };

  const sidebarMemberRows: Array<{
    key: 'adultsCount' | 'childrenCount' | 'seniorsCount' | 'respiratoryCareCount' | 'petsCount';
    label: string;
  }> = [
    { key: 'adultsCount', label: 'Adults' },
    { key: 'childrenCount', label: 'Kids / Infants' },
    { key: 'seniorsCount', label: 'Seniors (65+)' },
    { key: 'respiratoryCareCount', label: 'Asthma Care' },
    { key: 'petsCount', label: 'Pets' },
  ];

  return (
    <div className="app-shell min-h-screen flex flex-col bg-[#F7F3EA] text-[#2B241D]">
      {/* Minimal Single-Row Top Bar */}
      <HeaderBanner
        location={location}
        onSelectLocation={setLocation}
        profile={profile}
        showFamilyDrawer={showFamilyDrawer}
        onToggleFamilyDrawer={() => setShowFamilyDrawer((prev) => !prev)}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        sessionApiKey={sessionApiKey}
        onSaveSessionApiKey={setSessionApiKey}
      />

      {/* Full-Width Modern Edge-to-Edge App Shell (Zero Wasted Side Space) */}
      <div className="flex w-full flex-1 flex-col lg:flex-row">
        {/* Pinned Warm-Sand Left Sidebar Rail */}
        <aside className="beige-sidebar w-full lg:w-72 xl:w-80 shrink-0 px-4 py-5 sm:px-6 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] lg:overflow-y-auto space-y-5">
          <nav aria-label="Main guide sections">
            <span className="hidden lg:block px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#7A6E60]">
              Navigation
            </span>
            <div
              role="tablist"
              aria-orientation="vertical"
              className="stagger-children grid grid-cols-2 gap-2 lg:grid-cols-1"
            >
              {tabs.map((tab, idx) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={isSelected}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`hc-card flex flex-col gap-0.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-[#2D6A4F] bg-[#2D6A4F] text-[#FFFDF8] shadow-sm translate-x-0.5'
                        : 'border-transparent bg-[#FAF6EE]/80 text-[#2B241D] hover:bg-[#FFFDF9] hover:border-[#DFD2BE]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 text-xs font-extrabold">
                      <span className={isSelected ? 'text-[#D8F3DC]' : 'text-[#2D6A4F]'}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </span>
                    <span
                      className={`text-[11px] pl-6 leading-snug ${
                        isSelected ? 'text-[#E3F2E8]' : 'text-[#6A5E50]'
                      }`}
                    >
                      {tab.helper}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Quick Member Values Adjuster Card (Always 1 click away on Desktop) */}
          <div className="beige-panel hc-card animate-reveal-up reveal-delay-3 hidden lg:block rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#ECE2D0] pb-2">
              <span className="text-xs font-extrabold text-[#231D17] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
                Family Members ({profile.householdSize})
              </span>
              <button
                type="button"
                onClick={() => setShowFamilyDrawer((prev) => !prev)}
                className="text-[11px] font-bold text-[#1B4D35] hover:underline"
              >
                Home Settings
              </button>
            </div>

            <div className="space-y-2.5">
              {sidebarMemberRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-[#4E4439] font-semibold">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustMemberCount(row.key, -1)}
                      disabled={profile[row.key] <= 0}
                      aria-label={`Quick decrease ${row.label}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#DFD2BE] bg-[#FAF6EE] text-[#2B241D] hover:bg-[#EAE0CE] active:scale-95 disabled:opacity-35 transition"
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span className="w-6 text-center font-extrabold text-[#231D17]">
                      {profile[row.key]}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustMemberCount(row.key, 1)}
                      disabled={profile[row.key] >= 10}
                      aria-label={`Quick increase ${row.label}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#DFD2BE] bg-[#FAF6EE] text-[#2B241D] hover:bg-[#EAE0CE] active:scale-95 disabled:opacity-35 transition"
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Full-Width Spacious Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-10"
          >
            {/* Collapsible Full Family & Home Panel */}
            {showFamilyDrawer && (
              <FamilyProfileBar
                profile={profile}
                onUpdateProfile={setProfile}
                onResetDefaults={handleResetDefaults}
                onClose={() => setShowFamilyDrawer(false)}
              />
            )}

            {/* Animated Page Container (Smoothly Staggers Containers on Every Tab Change!) */}
            <div key={activeTab} className="stagger-children space-y-6">
              {/* Show Full Serene Hero on Overview Tab, or Compact 1-Line Context Bar on Other Tabs */}
              {activeTab === 'routines' ? (
                <AirStatusHero location={location} iaqSim={iaqSim} />
              ) : (
                <div className="beige-panel hc-card flex flex-wrap items-center justify-between gap-2 rounded-2xl px-5 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-[#231D17]">
                      {location.city}, {location.country}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severity.badgeClasses}`}
                    >
                      AQI {location.usAqi} · {severity.symbolCode}
                    </span>
                  </div>
                  <span className="text-[#4E4439]">
                    Best outdoor window:{' '}
                    <strong className="text-[#1B4D35]">{ventWindow.bestWindowLabel}</strong> · Indoor air:{' '}
                    <strong className="text-[#1B4D35]">{iaqSim.optimizedIndoorPm25} µg/m³</strong>
                  </span>
                </div>
              )}

              {/* Active Module Tabpanel */}
              <div
                id={`panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeTab}`}
                tabIndex={0}
              >
                {activeTab === 'routines' && (
                  <RoutinePlanner
                    location={location}
                    routines={routines}
                    onToggleRoutine={handleToggleRoutine}
                    onAdoptAllRoutines={handleAdoptAllRoutines}
                  />
                )}

                {activeTab === 'iaq-hacks' && (
                  <IndoorAirHacks
                    location={location}
                    profile={profile}
                    onUpdateProfile={setProfile}
                    allHacks={IAQ_HACKS_CATALOGUE}
                    activeHackIds={activeHackIds}
                    onToggleHack={handleToggleHack}
                    iaqSim={iaqSim}
                    cadrSizing={cadrSizing}
                    targetAch={targetAch}
                    onChangeTargetAch={setTargetAch}
                  />
                )}

                {activeTab === 'sustainable-swaps' && (
                  <SustainableSwaps
                    location={location}
                    profile={profile}
                    allSwaps={SUSTAINABLE_ALTERNATIVES_CATALOGUE}
                    selectedSwapIds={selectedSwapIds}
                    onToggleSwap={handleToggleSwap}
                    communityHouseholdsCount={communityHouseholdsCount}
                    onChangeCommunityHouseholdsCount={setCommunityHouseholdsCount}
                    impactSummary={impactSummary}
                  />
                )}

                {activeTab === 'ai-assistant' && (
                  <AiSmogAssistant
                    location={location}
                    profile={profile}
                    iaqSim={iaqSim}
                    cadrSizing={cadrSizing}
                    impactSummary={impactSummary}
                    sessionApiKey={sessionApiKey}
                    onOpenFamilySettings={() => setShowFamilyDrawer(true)}
                  />
                )}
              </div>
            </div>
          </main>

          {/* Full-Width Minimal Clean Footer */}
          <footer className="mt-auto border-t border-[#E6DCCB] bg-[#FAF6EE] px-4 py-4 sm:px-6 lg:px-10 text-xs text-[#6A5E50]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-[#B45309]" aria-hidden="true" />
                <span>
                  Based on WHO air guidelines (≤15 µg/m³ PM2.5), ASHRAE room filtration, and Berkeley Earth exposure equivalents. Consult a doctor for breathing emergencies.
                </span>
              </p>
              <p className="shrink-0 font-semibold text-[#4E4439]">
                AeroGuard AI
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
