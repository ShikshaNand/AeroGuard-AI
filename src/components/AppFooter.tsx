import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * Minimal full-width semantic footer citing scientific air quality benchmarks.
 */
export const AppFooter: React.FC = React.memo(() => (
  <footer className="mt-auto border-t border-line bg-surface-soft px-4 py-4 sm:px-6 lg:px-10 text-xs text-ink-subtle">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-1.5">
        <ShieldAlert className="h-4 w-4 shrink-0 text-warn-ink" aria-hidden="true" />
        <span>
          Based on WHO air guidelines (≤15 µg/m³ PM2.5), ASHRAE room filtration, and Berkeley Earth exposure equivalents. Consult a doctor for breathing emergencies.
        </span>
      </p>
      <p className="shrink-0 font-semibold text-ink-secondary">AeroGuard AI</p>
    </div>
  </footer>
));
AppFooter.displayName = 'AppFooter';
