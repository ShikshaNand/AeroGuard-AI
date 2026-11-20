import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SustainableSwaps } from '../components/SustainableSwaps';
import {
  DEFAULT_FAMILY_PROFILE,
  SUSTAINABLE_ALTERNATIVES_CATALOGUE,
  WINTER_SMOG_CITY_PRESETS,
} from '../data/smogPresets';
import {
  calculateAggregateImpact,
  generateTailoredDailyRoutines,
} from '../domain/impactCalculator';

describe('SustainableSwaps component & clipboard truthfulness', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const location = WINTER_SMOG_CITY_PRESETS[0];
  const routines = generateTailoredDailyRoutines(location, DEFAULT_FAMILY_PROFILE, new Set(['routine-morning-commute']));
  const impactSummary = calculateAggregateImpact(routines, SUSTAINABLE_ALTERNATIVES_CATALOGUE.slice(0, 2), 100, 4);

  it('reports clipboard success accurately when writeText succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(
      <SustainableSwaps
        location={location}
        profile={DEFAULT_FAMILY_PROFILE}
        allSwaps={SUSTAINABLE_ALTERNATIVES_CATALOGUE}
        selectedSwapIds={new Set(['swap-school-carpool-transit'])}
        onToggleSwap={vi.fn()}
        communityHouseholdsCount={100}
        onChangeCommunityHouseholdsCount={vi.fn()}
        impactSummary={impactSummary}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Copy Neighborhood Clean-Air Pledge/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Pledge Copied for WhatsApp \/ RWA!/i)).toBeInTheDocument();
    });
  });

  it('reports clipboard failure honestly instead of false success when clipboard is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      configurable: true,
    });

    render(
      <SustainableSwaps
        location={location}
        profile={DEFAULT_FAMILY_PROFILE}
        allSwaps={SUSTAINABLE_ALTERNATIVES_CATALOGUE}
        selectedSwapIds={new Set()}
        onToggleSwap={vi.fn()}
        communityHouseholdsCount={100}
        onChangeCommunityHouseholdsCount={vi.fn()}
        impactSummary={impactSummary}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Copy Neighborhood Clean-Air Pledge/i }));

    await waitFor(() => {
      expect(screen.getByText(/Clipboard Blocked — Copy Manually/i)).toBeInTheDocument();
    });
  });
});
