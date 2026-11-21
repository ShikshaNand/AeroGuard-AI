import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarNav, type SidebarTabDefinition } from '../components/SidebarNav';
import { DEFAULT_FAMILY_PROFILE } from '../data/smogPresets';

const TABS: SidebarTabDefinition[] = [
  { id: 'routines', label: 'Daily Plan', helper: 'Schedule', icon: <span>1</span> },
  { id: 'iaq-hacks', label: 'Indoor Air', helper: 'Hacks', icon: <span>2</span> },
  { id: 'sustainable-swaps', label: 'Eco Swaps', helper: 'Community', icon: <span>3</span> },
  { id: 'ai-assistant', label: 'Ask AI', helper: 'Coach', icon: <span>4</span> },
];

describe('SidebarNav WAI-ARIA tab keyboard navigation & quick steppers', () => {
  it('moves selection and DOM focus via ArrowDown, ArrowUp, Home, and End keys', () => {
    const onSelectTab = vi.fn();
    const onAdjustMemberCount = vi.fn();

    render(
      <SidebarNav
        tabs={TABS}
        activeTab="routines"
        onSelectTab={onSelectTab}
        profile={DEFAULT_FAMILY_PROFILE}
        onAdjustMemberCount={onAdjustMemberCount}
        onToggleFamilyDrawer={vi.fn()}
      />
    );

    const firstTab = screen.getByRole('tab', { name: /Daily Plan/i });
    firstTab.focus();

    fireEvent.keyDown(firstTab, { key: 'ArrowDown' });
    expect(onSelectTab).toHaveBeenLastCalledWith('iaq-hacks');
    expect(document.activeElement?.id).toBe('tab-iaq-hacks');

    fireEvent.keyDown(firstTab, { key: 'End' });
    expect(onSelectTab).toHaveBeenLastCalledWith('ai-assistant');
    expect(document.activeElement?.id).toBe('tab-ai-assistant');

    fireEvent.keyDown(firstTab, { key: 'Home' });
    expect(onSelectTab).toHaveBeenLastCalledWith('routines');
    expect(document.activeElement?.id).toBe('tab-routines');

    fireEvent.keyDown(firstTab, { key: 'ArrowUp' });
    expect(onSelectTab).toHaveBeenLastCalledWith('ai-assistant');

    fireEvent.click(screen.getByRole('button', { name: /Quick increase Adults/i }));
    expect(onAdjustMemberCount).toHaveBeenCalledWith('adultsCount', 1);
  });
});
