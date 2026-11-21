import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Clock,
  Home,
  Leaf,
  Bot,
  ShieldAlert,
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
import { useToggleSet } from './hooks/useToggleSet';
import { useDebouncedPersistState } from './hooks/usePersistedAppState';
import { HeaderBanner } from './components/HeaderBanner';
import { SidebarNav, type SidebarTabDefinition } from './components/SidebarNav';
import { AirStatusHero } from './components/AirStatusHero';
import { FamilyProfileBar } from './components/FamilyProfileBar';
import { RoutinePlanner } from './components/RoutinePlanner';
import { IndoorAirHacks } from './components/IndoorAirHacks';
import { SustainableSwaps } from './components/SustainableSwaps';
import { AiSmogAssistant } from './components/AiSmogAssistant';

type ActiveTabId = PersistedTabId;

export function App() {
  const [initialState] = useState(() => loadPersistedState());

  const [location, setLocation] = useState<LocationAirQuality>(initialState.location);
  const [profile, setProfile] = useState<FamilyProfile>(initialState.profile);
  const [activeTab, setActiveTab] = useState<ActiveTabId>(initialState.activeTab);
  const [showFamilyDrawer, setShowFamilyDrawer] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(initialState.theme);
  // SECURITY: API key is kept strictly in volatile RAM and never persisted to localStorage
  const [sessionApiKey, setSessionApiKey] = useState('');

  // Adopted Low-Emission Daily Routines, Indoor Air Hacks & Sustainable Swaps (via shared hook)
  const [adoptedRoutineIds, handleToggleRoutine, setAdoptedRoutineIds] = useToggleSet(
    initialState.adoptedRoutineIds
  );
  const [activeHackIds, handleToggleHack, setActiveHackIds] = useToggleSet(
    initialState.activeHackIds
  );
  const [selectedSwapIds, handleToggleSwap, setSelectedSwapIds] = useToggleSet(
    initialState.selectedSwapIds
  );

  const [targetAch, setTargetAch] = useState(initialState.targetAch);
  const [communityHouseholdsCount, setCommunityHouseholdsCount] = useState(
    initialState.communityHouseholdsCount
  );

  const persistedSnapshot = useMemo(
    () => ({
      profile,
      location,
      adoptedRoutineIds: Array.from(adoptedRoutineIds),
      activeHackIds: Array.from(activeHackIds),
      selectedSwapIds: Array.from(selectedSwapIds),
      targetAch,
      communityHouseholdsCount,
      theme,
      activeTab,
    }),
    [
      profile,
      location,
      adoptedRoutineIds,
      activeHackIds,
      selectedSwapIds,
      targetAch,
      communityHouseholdsCount,
      theme,
      activeTab,
    ]
  );

  useDebouncedPersistState(persistedSnapshot);

  const handleResetDefaults = () => {
    clearPersistedState();
    const defaults = getDefaultPersistedState();
    setProfile(defaults.profile);
    setLocation(defaults.location);
    setAdoptedRoutineIds(defaults.adoptedRoutineIds);
    setActiveHackIds(defaults.activeHackIds);
    setSelectedSwapIds(defaults.selectedSwapIds);
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
  const adjustMemberCount = useCallback((field: MemberCountField, delta: number) => {
    setProfile((prev) => applyMemberDelta(prev, field, delta));
  }, []);

  const handleToggleFamilyDrawer = useCallback(() => {
    setShowFamilyDrawer((prev) => !prev);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

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

  const handleAdoptAllRoutines = useCallback(() => {
    setAdoptedRoutineIds(routines.map((r) => r.id));
  }, [routines, setAdoptedRoutineIds]);

  const tabs = useMemo<SidebarTabDefinition[]>(
    () => [
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
    ],
    []
  );

  return (
    <div className="app-shell min-h-screen flex flex-col bg-canvas text-ink">
      {/* Minimal Single-Row Top Bar */}
      <HeaderBanner
        location={location}
        onSelectLocation={setLocation}
        profile={profile}
        showFamilyDrawer={showFamilyDrawer}
        onToggleFamilyDrawer={handleToggleFamilyDrawer}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        sessionApiKey={sessionApiKey}
        onSaveSessionApiKey={setSessionApiKey}
      />

      {/* Full-Width Modern Edge-to-Edge App Shell (Zero Wasted Side Space) */}
      <div className="flex w-full flex-1 flex-col lg:flex-row">
        {/* Pinned Warm-Sand Left Sidebar Rail */}
        <SidebarNav
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          profile={profile}
          onAdjustMemberCount={adjustMemberCount}
          onToggleFamilyDrawer={handleToggleFamilyDrawer}
        />

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
                    <strong className="text-brand-ink">{ventWindow.bestWindowLabel}</strong> · Indoor air:{' '}
                    <strong className="text-brand-ink">{iaqSim.optimizedIndoorPm25} µg/m³</strong>
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
          <footer className="mt-auto border-t border-line bg-surface-soft px-4 py-4 sm:px-6 lg:px-10 text-xs text-ink-subtle">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-warn-ink" aria-hidden="true" />
                <span>
                  Based on WHO air guidelines (≤15 µg/m³ PM2.5), ASHRAE room filtration, and Berkeley Earth exposure equivalents. Consult a doctor for breathing emergencies.
                </span>
              </p>
              <p className="shrink-0 font-semibold text-ink-secondary">
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
