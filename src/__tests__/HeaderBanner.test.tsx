import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeaderBanner } from '../components/HeaderBanner';
import { DEFAULT_FAMILY_PROFILE, WINTER_SMOG_CITY_PRESETS } from '../data/smogPresets';
import * as openMeteoService from '../services/openMeteoService';

describe('HeaderBanner city search listbox, Escape handling & API key drawer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('searches global cities with proper ARIA option roles, handles Escape, and validates API keys', async () => {
    const onSelectLocation = vi.fn();
    const onSaveSessionApiKey = vi.fn();

    vi.spyOn(openMeteoService, 'searchCities').mockResolvedValue([
      {
        id: 77,
        name: 'Zurich',
        country: 'Switzerland',
        admin1: 'Zurich',
        latitude: 47.3769,
        longitude: 8.5417,
      },
    ]);
    vi.spyOn(openMeteoService, 'fetchLiveAirQualityForCoords').mockResolvedValue({
      ...WINTER_SMOG_CITY_PRESETS[3],
      id: 'live-zurich',
      city: 'Zurich',
      country: 'Switzerland',
      isLiveApi: true,
    });

    render(
      <HeaderBanner
        location={WINTER_SMOG_CITY_PRESETS[0]}
        onSelectLocation={onSelectLocation}
        profile={DEFAULT_FAMILY_PROFILE}
        showFamilyDrawer={false}
        onToggleFamilyDrawer={vi.fn()}
        theme="light"
        onToggleTheme={vi.fn()}
        sessionApiKey=""
        isEnvOrProxyConnected={false}
        onSaveSessionApiKey={onSaveSessionApiKey}
      />
    );

    // Open city switcher and type a search query
    const cityBtn = screen.getByRole('button', { name: /Change city or search location/i });
    fireEvent.click(cityBtn);

    const searchInput = screen.getByLabelText(/Search any city worldwide/i);
    fireEvent.change(searchInput, { target: { value: 'Zurich' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Zurich/i })).toBeInTheDocument();
    });

    // ArrowDown from search input moves keyboard focus into the first listbox option
    const option = screen.getByRole('option', { name: /Zurich/i });
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(option);
    fireEvent.click(option);

    await waitFor(() => {
      expect(onSelectLocation).toHaveBeenCalledWith(expect.objectContaining({ city: 'Zurich' }));
    });

    // Open AI Settings drawer, test invalid key rejection, then save valid key
    const aiSettingsBtn = screen.getByRole('button', { name: /Configure optional Gemini API key/i });
    fireEvent.click(aiSettingsBtn);

    const keyInput = screen.getByLabelText(/^Gemini API Key$/i);
    fireEvent.change(keyInput, { target: { value: 'bad key' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot contain spaces/i);
    expect(onSaveSessionApiKey).not.toHaveBeenCalled();

    fireEvent.change(keyInput, { target: { value: 'AIzaSyValidKey_1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    expect(onSaveSessionApiKey).toHaveBeenCalledWith('AIzaSyValidKey_1234567890');

    // Opening drawer and pressing Escape closes it and restores focus to trigger
    fireEvent.click(aiSettingsBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(aiSettingsBtn);
  });
});
