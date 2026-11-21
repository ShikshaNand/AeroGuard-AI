import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CadrSizingCard } from '../components/CadrSizingCard';
import { DEFAULT_FAMILY_PROFILE } from '../data/smogPresets';
import { calculateCadrAndCorsiSizing } from '../domain/iaqCalculator';

describe('CadrSizingCard interactive sliders & DIY cost comparison', () => {
  it('invokes room-area and ACH callbacks and renders accurate DIY savings', () => {
    const onUpdateProfile = vi.fn();
    const onChangeTargetAch = vi.fn();
    const sizing = calculateCadrAndCorsiSizing(40, 2.8, 220, 6);

    render(
      <CadrSizingCard
        profile={{ ...DEFAULT_FAMILY_PROFILE, mainRoomAreaSqM: 40 }}
        onUpdateProfile={onUpdateProfile}
        cadrSizing={sizing}
        targetAch={6}
        onChangeTargetAch={onChangeTargetAch}
      />
    );

    expect(screen.getByText('6× Clean Air / Hour')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Room Floor Area/i), { target: { value: '55' } });
    expect(onUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ mainRoomAreaSqM: 55 }));

    fireEvent.change(screen.getByLabelText(/Clean Air Cycles Per Hour/i), {
      target: { value: '8' },
    });
    expect(onChangeTargetAch).toHaveBeenCalledWith(8);
  });
});
