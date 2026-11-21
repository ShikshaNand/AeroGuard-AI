import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FamilyProfileBar } from '../components/FamilyProfileBar';
import { DEFAULT_FAMILY_PROFILE } from '../data/smogPresets';

describe('FamilyProfileBar profile controls & runtime guards', () => {
  it('updates household settings, sanitizes family name, and supports reset/close actions', () => {
    const onUpdateProfile = vi.fn();
    const onResetDefaults = vi.fn();
    const onClose = vi.fn();

    render(
      <FamilyProfileBar
        profile={DEFAULT_FAMILY_PROFILE}
        onUpdateProfile={onUpdateProfile}
        onResetDefaults={onResetDefaults}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByLabelText(/Family Name/i), {
      target: { value: '<b>Sharma</b> Family' },
    });
    expect(onUpdateProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ familyName: 'Sharma Family' })
    );

    fireEvent.change(screen.getByLabelText(/Daily Travel/i), {
      target: { value: 'electric_vehicle' },
    });
    expect(onUpdateProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ commuteMode: 'electric_vehicle' })
    );

    fireEvent.change(screen.getByLabelText(/Home Heating/i), {
      target: { value: 'heat_pump_clean' },
    });
    expect(onUpdateProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ heatingType: 'heat_pump_clean' })
    );

    fireEvent.change(screen.getByLabelText(/Kitchen Stove/i), {
      target: { value: 'induction_electric' },
    });
    expect(onUpdateProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ cookingType: 'induction_electric' })
    );

    fireEvent.change(screen.getByLabelText(/Windows & Main Room/i), {
      target: { value: 'tight_weatherstripped' },
    });
    expect(onUpdateProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ homeSealing: 'tight_weatherstripped' })
    );

    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
    expect(onResetDefaults).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Close family profile panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
