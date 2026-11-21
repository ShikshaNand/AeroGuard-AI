import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import type { SustainableAlternative } from '../types';

interface SwapSlideCardProps {
  swap: SustainableAlternative;
  isSelected: boolean;
  onToggle: (swapId: string) => void;
}

/**
 * Sustainable Lifestyle Alternative Slide Card contrasting a high-emission habit
 * against a clean-air swap with quantified household PM/NOx and CO2e reductions.
 */
export const SwapSlideCard: React.FC<SwapSlideCardProps> = React.memo(
  ({ swap, isSelected, onToggle }) => (
    <article
      className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
        isSelected ? 'border-sage-line-strong bg-surface-active' : 'border-line bg-surface-soft'
      }`}
    >
      <div className="stagger-lines space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-chip border border-line-strong px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
              {swap.category.replace('_', ' ')}
            </span>
            <h3 className="mt-1.5 text-base font-extrabold text-ink sm:text-lg">{swap.title}</h3>
          </div>

          <button
            type="button"
            onClick={() => onToggle(swap.id)}
            aria-pressed={isSelected}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              isSelected
                ? 'bg-brand text-on-brand hover:bg-brand-hover shadow-sm'
                : 'border border-line-strong bg-surface text-ink hover:bg-chip'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{isSelected ? 'Committed' : 'Commit to Swap'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
          <div className="beige-terracotta rounded-xl p-3.5 text-danger-body leading-relaxed">
            <strong className="text-danger-warm block mb-1">✗ Instead of:</strong>
            {swap.highEmissionHabit}
          </div>
          <div className="beige-sage rounded-xl p-3.5 text-brand-soft font-medium leading-relaxed">
            <strong className="text-brand-deep flex items-center gap-1 mb-1">
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />✓ Sustainable Alternative:
            </strong>
            {swap.sustainableAlternative}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
          <div className="beige-inset rounded-xl p-3.5 text-ink-body leading-relaxed">
            <p className="flex items-start gap-2">
              <HeartPulse className="h-4 w-4 shrink-0 text-brand-ink mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-brand-ink block mb-0.5">Direct Personal Benefit:</strong>
                {swap.directPersonalBenefit}
              </span>
            </p>
          </div>
          <div className="beige-inset rounded-xl p-3.5 text-ink-body leading-relaxed">
            <p className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 shrink-0 text-warn-deep mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-ink block mb-0.5">Why Your Choice Matters:</strong>
                {swap.whyChoiceMatters}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-line pt-3.5 text-xs">
        <div className="beige-amber rounded-xl p-3 flex items-start gap-2 text-warn-body">
          <Lightbulb className="h-4 w-4 shrink-0 text-warn-ink mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-warn-ink">Practical Family Tip:</strong>{' '}
            {swap.practicalImplementationTip}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface border border-line px-3.5 py-2 text-[11px] text-ink-secondary">
          <span>
            Local Smog Cut:{' '}
            <strong className="text-ink">-{swap.dailyLocalPmAndNoxSavedGrams} g PM/NOx/day</strong>
          </span>
          <span>
            Carbon Cut:{' '}
            <strong className="text-brand-ink">-{swap.dailyCo2SavedKg} kg CO₂e/day</strong>
          </span>
        </div>
      </div>
    </article>
  )
);
SwapSlideCard.displayName = 'SwapSlideCard';
