import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Presentation } from 'lucide-react';

interface SlideDeckContainerProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T, index: number) => string;
  renderSlide: (item: T, index: number) => React.ReactNode;
  headerRightExtra?: React.ReactNode;
  defaultMode?: 'slides' | 'all';
  gridClassName?: string;
}

/**
 * Clean, Directional-Animated Slide Deck & Card Container
 * Eliminates visual clutter with crisp Previous/Next controls, smooth left/right
 * slide animations, an animated progress bar, and a 1-click All Cards toggle.
 */
export function SlideDeckContainer<T>({
  title,
  subtitle,
  items,
  getKey,
  getLabel,
  renderSlide,
  headerRightExtra,
  defaultMode = 'slides',
  gridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2',
}: SlideDeckContainerProps<T>) {
  const [viewMode, setViewMode] = useState<'slides' | 'all'>(defaultMode);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      setActiveIndex(0);
    }
  }, [items.length, activeIndex]);

  if (items.length === 0) {
    return (
      <div className="beige-panel hc-card rounded-3xl p-6 text-center text-sm text-[#5C5246]">
        No items match this filter.
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, items.length - 1);
  const currentItem = items[safeIndex];
  const progressPct = Math.round(((safeIndex + 1) / items.length) * 100);

  const handlePrev = () => {
    setDirection('prev');
    setActiveIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection('next');
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handleJumpTo = (idx: number) => {
    setDirection(idx >= safeIndex ? 'next' : 'prev');
    setActiveIndex(idx);
  };

  return (
    <section
      aria-label={title}
      className="beige-panel hc-card rounded-3xl p-5 sm:p-6 space-y-5 overflow-hidden"
    >
      {/* Clean Header Row */}
      <div className="flex flex-col gap-3 border-b border-[#ECE2D0] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[#231D17] sm:text-lg">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[#6A5E50] sm:text-sm">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {headerRightExtra}

          <div
            className="inline-flex rounded-xl bg-[#F1EADC] p-1 border border-[#E1D5C1]"
            role="group"
            aria-label="Layout view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('slides')}
              aria-pressed={viewMode === 'slides'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'slides'
                  ? 'bg-[#2D6A4F] text-[#FFFDF8] shadow-xs'
                  : 'text-[#4E4439] hover:text-[#231D17]'
              }`}
            >
              <Presentation className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Slide View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              aria-pressed={viewMode === 'all'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'all'
                  ? 'bg-[#2D6A4F] text-[#FFFDF8] shadow-xs'
                  : 'text-[#4E4439] hover:text-[#231D17]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>All ({items.length})</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'slides' ? (
        <div className="space-y-4">
          {/* Clean, Uncluttered Slide Controls & Progress Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#F1EADC] border border-[#E1D5C1] px-3 py-1 text-xs font-extrabold text-[#231D17]">
                Slide {safeIndex + 1} of {items.length}
              </span>
              <div className="hidden sm:block w-36 h-2 rounded-full bg-[#EBE2D3] overflow-hidden">
                <div
                  style={{ width: `${progressPct}%` }}
                  className="h-full rounded-full bg-[#2D6A4F] transition-all duration-300 ease-out"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="inline-flex items-center gap-1 rounded-xl border border-[#DDD0BC] bg-[#FAF6EE] px-3.5 py-2 text-xs font-bold text-[#231D17] hover:bg-[#EAE0CE] active:scale-95 transition"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="inline-flex items-center gap-1 rounded-xl bg-[#2D6A4F] px-3.5 py-2 text-xs font-bold text-[#FFFDF8] hover:bg-[#1B4D35] active:scale-95 transition shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Animated Directional Slide Stage */}
          <div
            key={getKey(currentItem)}
            aria-live="polite"
            className={direction === 'next' ? 'animate-slide-next' : 'animate-slide-prev'}
          >
            {renderSlide(currentItem, safeIndex)}
          </div>

          {/* Clickable Smooth Progress Dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {items.map((item, idx) => (
              <button
                key={`dot-${getKey(item)}`}
                type="button"
                aria-label={`Go to slide ${idx + 1}: ${getLabel(item, idx)}`}
                onClick={() => handleJumpTo(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === safeIndex
                    ? 'w-9 bg-[#2D6A4F]'
                    : 'w-2.5 bg-[#D8CBB6] hover:bg-[#A6947A]'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={`${gridClassName} stagger-children`}>
          {items.map((item, idx) => (
            <React.Fragment key={getKey(item)}>
              {renderSlide(item, idx)}
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
