import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface MemberCounterCardProps {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  value: number;
  min?: number;
  max?: number;
  onChange: (nextVal: number) => void;
}

/**
 * Accessible numeric stepper card for adjusting household member counts.
 */
export const MemberCounterCard: React.FC<MemberCounterCardProps> = React.memo(
  ({ id, label, sublabel, icon, value, min = 0, max = 10, onChange }) => {
    const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));

    return (
      <div className="beige-inset flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFFDF8] border border-[#E5DAC8] text-[#2D6A4F]">
            {icon}
          </span>
          <div className="min-w-0">
            <label htmlFor={id} className="block text-xs font-bold text-[#231D17] truncate">
              {label}
            </label>
            <span className="block text-[10px] text-[#6A5E50] truncate">{sublabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onChange(clamp(value - 1))}
            disabled={value <= min}
            aria-label={`Decrease ${label}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#D8CBB6] bg-[#FFFDF8] text-[#2B241D] hover:bg-[#EAE0CE] disabled:opacity-40 transition"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <input
            id={id}
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) {
                onChange(clamp(parsed));
              }
            }}
            aria-label={`${label} count`}
            className="w-10 rounded-lg border border-[#D8CBB6] bg-[#FFFDF8] py-1 text-center text-xs font-extrabold text-[#231D17]"
          />

          <button
            type="button"
            onClick={() => onChange(clamp(value + 1))}
            disabled={value >= max}
            aria-label={`Increase ${label}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#D8CBB6] bg-[#FFFDF8] text-[#2B241D] hover:bg-[#EAE0CE] disabled:opacity-40 transition"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }
);
MemberCounterCard.displayName = 'MemberCounterCard';
