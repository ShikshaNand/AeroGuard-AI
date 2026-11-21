import React from 'react';
import { CheckSquare, Square, Sparkles, AlertCircle } from 'lucide-react';
import type { IAQHack } from '../types';

interface HackSlideCardProps {
  hack: IAQHack;
  isActive: boolean;
  onToggle: (hackId: string) => void;
}

/**
 * Interactive Indoor Air Quality Hack Slide Card with physics explanation,
 * family benefit summary, and step-by-step implementation checklist.
 */
export const HackSlideCard: React.FC<HackSlideCardProps> = React.memo(
  ({ hack, isActive, onToggle }) => (
    <article
      className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
        isActive ? 'border-sage-line-strong bg-surface-active' : 'border-line bg-surface-soft'
      }`}
    >
      <div className="stagger-lines">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sage-pill border border-sage-line-strong px-2.5 py-0.5 text-[11px] font-bold text-brand-ink">
                -{hack.indoorPm25ReductionPct}% Indoor PM2.5
              </span>
              <span className="rounded-full bg-chip border border-line-strong px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
                {hack.costTier}
              </span>
              <span className="text-[11px] font-medium text-ink-subtle">
                ⏱ {hack.setupTimeMinutes} min setup
              </span>
            </div>
            <h4 className="text-base font-extrabold text-ink sm:text-lg pt-0.5">{hack.title}</h4>
          </div>

          <button
            type="button"
            onClick={() => onToggle(hack.id)}
            aria-pressed={isActive}
            aria-label={`Toggle ${hack.title}`}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold active:scale-95 transition ${
              isActive
                ? 'bg-brand text-on-brand hover:bg-brand-hover shadow-sm'
                : 'border border-line-strong bg-surface text-ink hover:bg-chip'
            }`}
          >
            {isActive ? (
              <>
                <CheckSquare className="h-4 w-4" aria-hidden="true" />
                <span>Active in Home</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4" aria-hidden="true" />
                <span>Enable Hack</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="beige-inset hover-lift rounded-xl p-3.5 text-xs text-ink-body leading-relaxed">
            <strong className="text-ink block mb-1">🔬 How the Physics Works</strong>
            {hack.scientificMechanism}
          </div>
          <div className="beige-sage hover-lift rounded-xl p-3.5 text-xs text-brand-soft leading-relaxed">
            <strong className="text-brand-deep flex items-center gap-1 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              Direct Family Health Benefit
            </strong>
            {hack.directHealthImpact}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-surface border border-line p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
            Step-by-Step Implementation Checklist:
          </span>
          <ol className="stagger-lines space-y-1.5 text-xs text-ink-body">
            {hack.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-chip text-[11px] font-extrabold text-ink">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {hack.isHighPriorityForProfile && (
        <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-warn-deep border-t border-line pt-2.5">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Priority safeguard for households with children, seniors, or respiratory sensitivity
          </span>
        </div>
      )}
    </article>
  )
);
HackSlideCard.displayName = 'HackSlideCard';
