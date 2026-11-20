import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IndoorAirHacks } from '../components/IndoorAirHacks';
import {
  DEFAULT_FAMILY_PROFILE,
  IAQ_HACKS_CATALOGUE,
  WINTER_SMOG_CITY_PRESETS,
} from '../data/smogPresets';
import {
  calculateCadrAndCorsiSizing,
  simulateIndoorAirQuality,
} from '../domain/iaqCalculator';

describe('IndoorAirHacks component', () => {
  const location = WINTER_SMOG_CITY_PRESETS[0];

  it('syncs the ACH badge dynamically, filters hacks by cost tier, and displays humidity guard', () => {
    const onToggleHack = vi.fn();
    const onChangeTargetAch = vi.fn();
    const highHumidityProfile = { ...DEFAULT_FAMILY_PROFILE, indoorRelativeHumidityPct: 68 };
    const activeIds = new Set(['hack-corsi-rosenthal']);
    const iaqSim = simulateIndoorAirQuality(
      location.pm25,
      highHumidityProfile,
      IAQ_HACKS_CATALOGUE.filter((h) => activeIds.has(h.id))
    );
    const cadrSizing = calculateCadrAndCorsiSizing(
      highHumidityProfile.mainRoomAreaSqM,
      highHumidityProfile.ceilingHeightM,
      location.pm25,
      7
    );

    render(
      <IndoorAirHacks
        location={location}
        profile={highHumidityProfile}
        onUpdateProfile={vi.fn()}
        allHacks={IAQ_HACKS_CATALOGUE}
        activeHackIds={activeIds}
        onToggleHack={onToggleHack}
        iaqSim={iaqSim}
        cadrSizing={cadrSizing}
        targetAch={7}
        onChangeTargetAch={onChangeTargetAch}
      />
    );

    // Dynamic ACH badge matches targetAch (7x, not hardcoded 5x)
    expect(screen.getByText('7× Clean Air / Hour')).toBeInTheDocument();

    // High-humidity mold/dust-mite guard surfaces when RH > 60%
    expect(screen.getByText(/High Indoor Humidity \(68%\)/i)).toBeInTheDocument();

    // Cost filter narrows slides cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Free Today' }));
    const freeCount = IAQ_HACKS_CATALOGUE.filter((h) => h.costTier === 'Free Today').length;
    expect(screen.getByText(`Slide 1 of ${freeCount}`)).toBeInTheDocument();

    // Toggling an active hack invokes callback
    const toggleButtons = screen.getAllByRole('button', { name: /Toggle /i });
    fireEvent.click(toggleButtons[0]);
    expect(onToggleHack).toHaveBeenCalledTimes(1);
  });
});
