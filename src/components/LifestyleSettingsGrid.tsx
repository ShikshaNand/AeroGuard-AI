import React from 'react';
import { Car, Flame, Utensils, Home } from 'lucide-react';
import type { FamilyProfile } from '../types';
import {
  isCommuteMode,
  isCookingFuelType,
  isHeatingFuelType,
  isHomeSealingLevel,
} from '../domain/profileGuards';

interface LifestyleSettingsGridProps {
  profile: FamilyProfile;
  onUpdateProfile: (updated: FamilyProfile) => void;
}

/**
 * 4-column Household Travel, Heating, Cooking & Window-Sealing Configuration Grid
 * Uses shared runtime enum guards instead of unsafe `as` type casts.
 */
export const LifestyleSettingsGrid: React.FC<LifestyleSettingsGridProps> = React.memo(
  ({ profile, onUpdateProfile }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-line-subtle pt-4">
      {/* Commute */}
      <div className="beige-inset space-y-2 rounded-2xl p-3.5">
        <label htmlFor="commute-mode-select" className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Car className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
          Daily Travel
        </label>
        <select
          id="commute-mode-select"
          value={profile.commuteMode}
          onChange={(e) => {
            if (isCommuteMode(e.target.value)) {
              onUpdateProfile({ ...profile, commuteMode: e.target.value });
            }
          }}
          className="w-full rounded-xl border border-line-strong bg-surface px-2.5 py-2 text-xs text-ink font-medium"
        >
          <option value="car_solo_ice">Solo Petrol/Diesel Car</option>
          <option value="carpool_shared">Shared Carpool</option>
          <option value="public_transit_metro">Metro / Bus Transit</option>
          <option value="electric_vehicle">Electric Car (EV)</option>
          <option value="active_walk_cycle">Walking / Cycling</option>
        </select>

        <div className="pt-1">
          <div className="flex justify-between text-[11px] text-ink-muted">
            <label htmlFor="commute-km-range">Daily distance</label>
            <span className="font-bold text-brand-ink">{profile.dailyCommuteKm} km</span>
          </div>
          <input
            id="commute-km-range"
            type="range"
            min={2}
            max={60}
            value={profile.dailyCommuteKm}
            onChange={(e) =>
              onUpdateProfile({ ...profile, dailyCommuteKm: Number(e.target.value) })
            }
            className="mt-1 w-full accent-brand"
          />
        </div>
      </div>

      {/* Heating */}
      <div className="beige-inset space-y-2 rounded-2xl p-3.5">
        <label htmlFor="heating-type-select" className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Flame className="h-3.5 w-3.5 text-warn-ink" aria-hidden="true" />
          Home Heating
        </label>
        <select
          id="heating-type-select"
          value={profile.heatingType}
          onChange={(e) => {
            if (isHeatingFuelType(e.target.value)) {
              onUpdateProfile({ ...profile, heatingType: e.target.value });
            }
          }}
          className="w-full rounded-xl border border-line-strong bg-surface px-2.5 py-2 text-xs text-ink font-medium"
        >
          <option value="wood_coal_biomass">Wood / Coal Stove</option>
          <option value="gas_furnace">Gas Heater / Boiler</option>
          <option value="electric_resistance">Electric Room Heater</option>
          <option value="heat_pump_clean">Heat Pump / Inverter AC</option>
        </select>
        <p className="text-[11px] text-ink-subtle leading-snug">
          Used to estimate indoor dust and winter heating savings.
        </p>
      </div>

      {/* Cooking */}
      <div className="beige-inset space-y-2 rounded-2xl p-3.5">
        <label htmlFor="cooking-type-select" className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Utensils className="h-3.5 w-3.5 text-danger-warm" aria-hidden="true" />
          Kitchen Stove
        </label>
        <select
          id="cooking-type-select"
          value={profile.cookingType}
          onChange={(e) => {
            if (isCookingFuelType(e.target.value)) {
              onUpdateProfile({ ...profile, cookingType: e.target.value });
            }
          }}
          className="w-full rounded-xl border border-line-strong bg-surface px-2.5 py-2 text-xs text-ink font-medium"
        >
          <option value="lpg_gas_unvented">Gas Stove (No Chimney)</option>
          <option value="gas_with_chimney_hood">Gas Stove + Chimney Hood</option>
          <option value="induction_electric">Electric Induction</option>
        </select>
        <p className="text-[11px] text-ink-subtle leading-snug">
          Gas cooking in closed winter rooms releases extra fumes indoors.
        </p>
      </div>

      {/* Windows & Main Room */}
      <div className="beige-inset space-y-2 rounded-2xl p-3.5">
        <label htmlFor="home-sealing-select" className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Home className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
          Windows &amp; Main Room
        </label>
        <select
          id="home-sealing-select"
          value={profile.homeSealing}
          onChange={(e) => {
            if (isHomeSealingLevel(e.target.value)) {
              onUpdateProfile({ ...profile, homeSealing: e.target.value });
            }
          }}
          className="w-full rounded-xl border border-line-strong bg-surface px-2.5 py-2 text-xs text-ink font-medium"
        >
          <option value="leaky_drafty">Older / Drafty Windows</option>
          <option value="standard_masonry">Standard Windows</option>
          <option value="tight_weatherstripped">Tightly Sealed Windows</option>
        </select>

        <div className="pt-1">
          <div className="flex justify-between text-[11px] text-ink-muted">
            <label htmlFor="room-area-range">Living room size</label>
            <span className="font-bold text-brand-ink">{profile.mainRoomAreaSqM} m²</span>
          </div>
          <input
            id="room-area-range"
            type="range"
            min={12}
            max={90}
            value={profile.mainRoomAreaSqM}
            onChange={(e) =>
              onUpdateProfile({ ...profile, mainRoomAreaSqM: Number(e.target.value) })
            }
            className="mt-1 w-full accent-brand"
          />
        </div>
      </div>
    </div>
  )
);
LifestyleSettingsGrid.displayName = 'LifestyleSettingsGrid';
