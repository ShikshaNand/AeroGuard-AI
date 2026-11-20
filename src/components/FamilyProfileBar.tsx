import React from 'react';
import {
  Users,
  Baby,
  HeartPulse,
  Dog,
  Car,
  Flame,
  Utensils,
  Home,
  X,
  User,
  RotateCcw,
} from 'lucide-react';
import type {
  CommuteMode,
  CookingFuelType,
  FamilyProfile,
  HeatingFuelType,
  HomeSealingLevel,
} from '../types';
import { sanitizeTextInput } from '../utils/security';
import { applyMemberCounts, type MemberCountField } from '../domain/familyMembers';
import { MemberCounterCard } from './MemberCounterCard';

interface FamilyProfileBarProps {
  profile: FamilyProfile;
  onUpdateProfile: (updated: FamilyProfile) => void;
  onResetDefaults?: () => void;
  onClose?: () => void;
}

export const FamilyProfileBar: React.FC<FamilyProfileBarProps> = ({
  profile,
  onUpdateProfile,
  onResetDefaults,
  onClose,
}) => {
  const updateMemberCounts = (
    patch: Partial<Pick<FamilyProfile, MemberCountField>>
  ) => {
    onUpdateProfile(applyMemberCounts(profile, patch));
  };

  return (
    <section
      aria-label="Family and Lifestyle Profile Configuration"
      className="beige-panel hc-card animate-drawer-enter rounded-3xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ECE2D0] pb-4">
        <div>
          <h2 className="text-base font-extrabold text-[#231D17] flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
            Personalize Advice for Your Family &amp; Home
          </h2>
          <p className="mt-0.5 text-xs text-[#6A5E50]">
            Change member counts or home settings below—your daily schedule, indoor air calculations, and AI coach update immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#E6F1EA] border border-[#BDD8C5] px-3 py-1 text-xs font-bold text-[#1B4D35]">
            Total: {profile.householdSize} {profile.householdSize === 1 ? 'Person' : 'People'} · Auto-saved
          </span>
          {onResetDefaults && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1 rounded-xl border border-[#DFD2BE] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#5C5246] hover:bg-[#EAE0CE]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close family profile panel"
              className="inline-flex items-center gap-1 rounded-xl border border-[#DFD2BE] bg-[#F6F0E4] px-3 py-1.5 text-xs font-bold text-[#2B241D] hover:bg-[#EAE0CE]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Family Name & Exact Member Count Steppers */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-bold text-[#4E4439]">
            Household Members (Adjust Counts)
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="family-name-input" className="text-xs font-semibold text-[#6A5E50]">
              Family Name:
            </label>
            <input
              id="family-name-input"
              type="text"
              maxLength={40}
              value={profile.familyName}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  familyName: sanitizeTextInput(e.target.value, 40) || 'My Family',
                })
              }
              className="rounded-xl border border-[#D8CBB6] bg-[#FAF6EE] px-3 py-1.5 text-xs font-bold text-[#231D17] focus:bg-[#FFFDF8] focus:border-[#2D6A4F]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <MemberCounterCard
            id="member-adults-input"
            label="Adults"
            sublabel="Ages 18–64"
            icon={<User className="h-4 w-4" aria-hidden="true" />}
            value={profile.adultsCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ adultsCount: val })}
          />
          <MemberCounterCard
            id="member-children-input"
            label="Kids & Infants"
            sublabel="Developing lungs"
            icon={<Baby className="h-4 w-4" aria-hidden="true" />}
            value={profile.childrenCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ childrenCount: val })}
          />
          <MemberCounterCard
            id="member-seniors-input"
            label="Seniors (65+)"
            sublabel="Heart & lung care"
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            value={profile.seniorsCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ seniorsCount: val })}
          />
          <MemberCounterCard
            id="member-asthma-input"
            label="Asthma / Breathing Care"
            sublabel="Sensitive airways"
            icon={<HeartPulse className="h-4 w-4 text-[#B45309]" aria-hidden="true" />}
            value={profile.respiratoryCareCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ respiratoryCareCount: val })}
          />
          <MemberCounterCard
            id="member-pets-input"
            label="Pets at Home"
            sublabel="Dogs & cats"
            icon={<Dog className="h-4 w-4 text-[#8D6E63]" aria-hidden="true" />}
            value={profile.petsCount}
            min={0}
            max={10}
            onChange={(val) => updateMemberCounts({ petsCount: val })}
          />
        </div>
      </div>

      {/* Row 2: 4 Clean Lifestyle & Home Containers */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-[#ECE2D0] pt-4">
        {/* Commute */}
        <div className="beige-inset space-y-2 rounded-2xl p-3.5">
          <label
            htmlFor="commute-mode-select"
            className="flex items-center gap-1.5 text-xs font-bold text-[#2B241D]"
          >
            <Car className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
            Daily Travel
          </label>
          <select
            id="commute-mode-select"
            value={profile.commuteMode}
            onChange={(e) =>
              onUpdateProfile({
                ...profile,
                commuteMode: e.target.value as CommuteMode,
              })
            }
            className="w-full rounded-xl border border-[#D8CBB6] bg-[#FFFDF8] px-2.5 py-2 text-xs text-[#2B241D] font-medium"
          >
            <option value="car_solo_ice">Solo Petrol/Diesel Car</option>
            <option value="carpool_shared">Shared Carpool</option>
            <option value="public_transit_metro">Metro / Bus Transit</option>
            <option value="electric_vehicle">Electric Car (EV)</option>
            <option value="active_walk_cycle">Walking / Cycling</option>
          </select>

          <div className="pt-1">
            <div className="flex justify-between text-[11px] text-[#5C5246]">
              <label htmlFor="commute-km-range">Daily distance</label>
              <span className="font-bold text-[#1B4D35]">{profile.dailyCommuteKm} km</span>
            </div>
            <input
              id="commute-km-range"
              type="range"
              min={2}
              max={60}
              value={profile.dailyCommuteKm}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  dailyCommuteKm: Number(e.target.value),
                })
              }
              className="mt-1 w-full accent-[#2D6A4F]"
            />
          </div>
        </div>

        {/* Heating */}
        <div className="beige-inset space-y-2 rounded-2xl p-3.5">
          <label
            htmlFor="heating-type-select"
            className="flex items-center gap-1.5 text-xs font-bold text-[#2B241D]"
          >
            <Flame className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
            Home Heating
          </label>
          <select
            id="heating-type-select"
            value={profile.heatingType}
            onChange={(e) =>
              onUpdateProfile({
                ...profile,
                heatingType: e.target.value as HeatingFuelType,
              })
            }
            className="w-full rounded-xl border border-[#D8CBB6] bg-[#FFFDF8] px-2.5 py-2 text-xs text-[#2B241D] font-medium"
          >
            <option value="wood_coal_biomass">Wood / Coal Stove</option>
            <option value="gas_furnace">Gas Heater / Boiler</option>
            <option value="electric_resistance">Electric Room Heater</option>
            <option value="heat_pump_clean">Heat Pump / Inverter AC</option>
          </select>
          <p className="text-[11px] text-[#6A5E50] leading-snug">
            Used to estimate indoor dust and winter heating savings.
          </p>
        </div>

        {/* Cooking */}
        <div className="beige-inset space-y-2 rounded-2xl p-3.5">
          <label
            htmlFor="cooking-type-select"
            className="flex items-center gap-1.5 text-xs font-bold text-[#2B241D]"
          >
            <Utensils className="h-3.5 w-3.5 text-[#9A3412]" aria-hidden="true" />
            Kitchen Stove
          </label>
          <select
            id="cooking-type-select"
            value={profile.cookingType}
            onChange={(e) =>
              onUpdateProfile({
                ...profile,
                cookingType: e.target.value as CookingFuelType,
              })
            }
            className="w-full rounded-xl border border-[#D8CBB6] bg-[#FFFDF8] px-2.5 py-2 text-xs text-[#2B241D] font-medium"
          >
            <option value="lpg_gas_unvented">Gas Stove (No Chimney)</option>
            <option value="gas_with_chimney_hood">Gas Stove + Chimney Hood</option>
            <option value="induction_electric">Electric Induction</option>
          </select>
          <p className="text-[11px] text-[#6A5E50] leading-snug">
            Gas cooking in closed winter rooms releases extra fumes indoors.
          </p>
        </div>

        {/* Home Windows & Room Size */}
        <div className="beige-inset space-y-2 rounded-2xl p-3.5">
          <label
            htmlFor="home-sealing-select"
            className="flex items-center gap-1.5 text-xs font-bold text-[#2B241D]"
          >
            <Home className="h-3.5 w-3.5 text-[#2D6A4F]" aria-hidden="true" />
            Windows &amp; Main Room
          </label>
          <select
            id="home-sealing-select"
            value={profile.homeSealing}
            onChange={(e) =>
              onUpdateProfile({
                ...profile,
                homeSealing: e.target.value as HomeSealingLevel,
              })
            }
            className="w-full rounded-xl border border-[#D8CBB6] bg-[#FFFDF8] px-2.5 py-2 text-xs text-[#2B241D] font-medium"
          >
            <option value="leaky_drafty">Older / Drafty Windows</option>
            <option value="standard_masonry">Standard Windows</option>
            <option value="tight_weatherstripped">Tightly Sealed Windows</option>
          </select>

          <div className="pt-1">
            <div className="flex justify-between text-[11px] text-[#5C5246]">
              <label htmlFor="room-area-range">Living room size</label>
              <span className="font-bold text-[#1B4D35]">{profile.mainRoomAreaSqM} m²</span>
            </div>
            <input
              id="room-area-range"
              type="range"
              min={12}
              max={90}
              value={profile.mainRoomAreaSqM}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  mainRoomAreaSqM: Number(e.target.value),
                })
              }
              className="mt-1 w-full accent-[#2D6A4F]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
