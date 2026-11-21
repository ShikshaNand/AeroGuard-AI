import { lazy, Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { Clock, Home, Leaf, Bot } from 'lucide-react';
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
import {
  checkServerGeminiProxy,
  hasClientGeminiKey,
} from './services/geminiApiClient';
import { useToggleSet } from './hooks/useToggleSet';
import { useDebouncedPersistState } from './hooks/usePersistedAppState';
import { HeaderBanner } from './components/HeaderBanner';
import { SidebarNav, type SidebarTabDefinition } from './components/SidebarNav';
import { AirStatusHero } from './components/AirStatusHero';
import { CompactContextBar } from './components/CompactContextBar';
import { AppFooter } from './components/AppFooter';
import { FamilyProfileBar } from './components/FamilyProfileBar';
import { RoutinePlanner } from './components/RoutinePlanner';

// Code-split secondary module tabs for faster initial First Contentful Paint
const IndoorAirHacks = lazy(() =>
  import('./components/IndoorAirHacks').then((m) => ({ default: m.IndoorAirHacks }))
);
const SustainableSwaps = lazy(() =>
  import('./components/SustainableSwaps').then((m) => ({ default: m.SustainableSwaps }))
);
const AiSmogAssistant = lazy(() =>
  import('./components/AiSmogAssistant').then((m) => ({ default: m.AiSmogAssistant }))
);

type ActiveTabId = PersistedTabId;

export function App() {
  const [initialState] = useState(() => loadPersistedState());

  const [location, setLocation] = useState<LocationAirQuality>(initialState.location);
  const [profile, setProfile] = useState<FamilyProfile>(initialState.profile);
  const [activeTab, setActiveTab] = useState<ActiveTabId>(initialState.activeTab);
  const [showFamilyDrawer, setShowFamilyDrawer] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(initialState.theme);
  // SECURITY: Optional user-entered API key stays strictly in volatile RAM
  const [sessionApiKey, setSessionApiKey] = useState('');
  const [hasServerGeminiProxy, setHasServerGeminiProxy] = useState(false);

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

  // Probe same-origin Vercel /api/gemini serverless proxy once on mount
  useEffect(() => {
    let active = true;
    void checkServerGeminiProxy().then((configured) => {
      if (active) {
        setHasServerGeminiProxy(configured);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const isEnvOrProxyConnected = hasClientGeminiKey() || hasServerGeminiProxy;
  const isGeminiLiveAvailable = hasClientGeminiKey(sessionApiKey) || hasServerGeminiProxy;

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

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }, [theme]);

  const handleResetDefaults = useCallback(() => {
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
  }, [setAdoptedRoutineIds, setActiveHackIds, setSelectedSwapIds]);

  const adjustMemberCount = useCallback((field: MemberCountField, delta: number) => {
    setProfile((prev) => applyMemberDelta(prev, field, delta));
  }, []);

  const handleToggleFamilyDrawer = useCallback(() => {
    setShowFamilyDrawer((prev) => !prev);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const routines = useMemo(
    () => generateTailoredDailyRoutines(location, profile, adoptedRoutineIds),
    [location, profile, adoptedRoutineIds]
  );

  const activeHacks = useMemo(
    () => IAQ_HACKS_CATALOGUE.filter((h) => activeHackIds.has(h.id)),
    [activeHackIds]
  );

  const selectedSwaps = useMemo(
    () => SUSTAINABLE_ALTERNATIVES_CATALOGUE.filter((s) => selectedSwapIds.has(s.id)),
    [selectedSwapIds]
  );

  const iaqSim = useMemo(
    () => simulateIndoorAirQuality(location.pm25, profile, activeHacks),
    [location.pm25, profile, activeHacks]
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

  const impactSummary = useMemo(
    () =>
      calculateAggregateImpact(
        routines,
        selectedSwaps,
        communityHouseholdsCount,
        profile.householdSize
      ),
    [routines, selectedSwaps, communityHouseholdsCount, profile.householdSize]
  );

  const severity = useMemo(() => getAQISeverityMetadata(location.usAqi), [location.usAqi]);
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
      <HeaderBanner
        location={location}
        onSelectLocation={setLocation}
        profile={profile}
        showFamilyDrawer={showFamilyDrawer}
        onToggleFamilyDrawer={handleToggleFamilyDrawer}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        sessionApiKey={sessionApiKey}
        isEnvOrProxyConnected={isEnvOrProxyConnected}
        onSaveSessionApiKey={setSessionApiKey}
      />

      <div className="flex w-full flex-1 flex-col lg:flex-row">
        <SidebarNav
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          profile={profile}
          onAdjustMemberCount={adjustMemberCount}
          onToggleFamilyDrawer={handleToggleFamilyDrawer}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main-content" className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-10">
            {showFamilyDrawer && (
              <FamilyProfileBar
                profile={profile}
                onUpdateProfile={setProfile}
                onResetDefaults={handleResetDefaults}
                onClose={() => setShowFamilyDrawer(false)}
              />
            )}

            <div key={activeTab} className="stagger-children space-y-6">
              {activeTab === 'routines' ? (
                <AirStatusHero location={location} iaqSim={iaqSim} />
              ) : (
                <CompactContextBar
                  location={location}
                  severity={severity}
                  bestVentWindow={ventWindow.bestWindowLabel}
                  optimizedIndoorPm25={iaqSim.optimizedIndoorPm25}
                />
              )}

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

                <Suspense
                  fallback={
                    <div
                      role="status"
                      className="beige-panel rounded-3xl p-8 text-center text-xs font-semibold text-ink-muted"
                    >
                      Loading module...
                    </div>
                  }
                >
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
                      isGeminiLiveAvailable={isGeminiLiveAvailable}
                      onOpenFamilySettings={() => setShowFamilyDrawer(true)}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          </main>

          <AppFooter />
        </div>
      </div>
    </div>
  );
}

export default App;
