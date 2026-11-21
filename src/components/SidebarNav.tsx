import React from 'react';
import { Users, Minus, Plus } from 'lucide-react';
import type { FamilyProfile } from '../types';
import type { PersistedTabId } from '../utils/storage';
import type { MemberCountField } from '../domain/familyMembers';

export interface SidebarTabDefinition {
  id: PersistedTabId;
  label: string;
  helper: string;
  icon: React.ReactNode;
}

interface SidebarNavProps {
  tabs: SidebarTabDefinition[];
  activeTab: PersistedTabId;
  onSelectTab: (tabId: PersistedTabId) => void;
  profile: FamilyProfile;
  onAdjustMemberCount: (field: MemberCountField, delta: number) => void;
  onToggleFamilyDrawer: () => void;
}

const SIDEBAR_MEMBER_ROWS: ReadonlyArray<{ field: MemberCountField; label: string }> = [
  { field: 'adultsCount', label: 'Adults' },
  { field: 'childrenCount', label: 'Kids / Infants' },
  { field: 'seniorsCount', label: 'Seniors (65+)' },
  { field: 'respiratoryCareCount', label: 'Asthma Care' },
  { field: 'petsCount', label: 'Pets' },
];

export const SidebarNav: React.FC<SidebarNavProps> = React.memo(
  ({
    tabs,
    activeTab,
    onSelectTab,
    profile,
    onAdjustMemberCount,
    onToggleFamilyDrawer,
  }) => {
    const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = tabs.length - 1;
      }

      if (nextIdx !== null) {
        e.preventDefault();
        const nextTabId = tabs[nextIdx].id;
        onSelectTab(nextTabId);
        document.getElementById(`tab-${nextTabId}`)?.focus();
      }
    };

    return (
      <aside className="beige-sidebar w-full lg:w-72 xl:w-80 shrink-0 px-4 py-5 sm:px-6 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] lg:overflow-y-auto space-y-5">
        <nav aria-label="Main guide sections">
          <span className="hidden lg:block px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
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
                  onClick={() => onSelectTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`flex flex-col gap-0.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-brand bg-brand text-on-brand shadow-sm translate-x-0.5'
                      : 'border-transparent bg-surface-soft/80 text-ink hover:bg-surface hover:border-line-strong'
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-xs font-extrabold">
                    <span className={isSelected ? 'text-on-brand/85' : 'text-brand-ink'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </span>
                  <span
                    className={`text-[11px] pl-6 leading-snug ${
                      isSelected ? 'text-on-brand/85' : 'text-ink-subtle'
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
        <div className="beige-panel animate-reveal-up reveal-delay-3 hidden lg:block rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-line-subtle pb-2">
            <span className="text-xs font-extrabold text-ink flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              Family Members ({profile.householdSize})
            </span>
            <button
              type="button"
              onClick={onToggleFamilyDrawer}
              className="text-[11px] font-bold text-brand-ink hover:underline"
            >
              Home Settings
            </button>
          </div>

          <div className="space-y-2.5">
            {SIDEBAR_MEMBER_ROWS.map((row) => (
              <div
                key={row.field}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-ink-secondary font-semibold">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAdjustMemberCount(row.field, -1)}
                    disabled={profile[row.field] <= 0}
                    aria-label={`Quick decrease ${row.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-surface-soft text-ink hover:bg-chip-hover active:scale-95 disabled:opacity-35 transition"
                  >
                    <Minus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center font-extrabold text-ink">
                    {profile[row.field]}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustMemberCount(row.field, 1)}
                    disabled={profile[row.field] >= 10}
                    aria-label={`Quick increase ${row.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-surface-soft text-ink hover:bg-chip-hover active:scale-95 disabled:opacity-35 transition"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }
);
SidebarNav.displayName = 'SidebarNav';
