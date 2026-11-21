import React, { useEffect, useRef, useState } from 'react';

interface RevealOnScrollProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

/**
 * Shared singleton IntersectionObserver pool across all RevealOnScroll wrappers.
 * Avoids allocating a separate browser observer instance for every page section.
 */
const revealCallbacks = new WeakMap<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;
let observedCount = 0;

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null;
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = revealCallbacks.get(entry.target);
            if (cb) {
              cb();
              unobserveElement(entry.target);
            }
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
  }
  return sharedObserver;
}

function observeElement(el: Element, onReveal: () => void): void {
  const observer = getSharedObserver();
  if (!observer) {
    onReveal();
    return;
  }
  revealCallbacks.set(el, onReveal);
  observer.observe(el);
  observedCount += 1;
}

function unobserveElement(el: Element): void {
  if (!revealCallbacks.has(el)) return;
  revealCallbacks.delete(el);
  sharedObserver?.unobserve(el);
  observedCount = Math.max(0, observedCount - 1);
  if (observedCount === 0 && sharedObserver) {
    sharedObserver.disconnect();
    sharedObserver = null;
  }
}

/**
 * Scroll-Triggered Smooth Line-by-Line Reveal Wrapper
 * Shares a single IntersectionObserver across the page while remaining immediately
 * visible when IntersectionObserver is unavailable or prefers-reduced-motion is active.
 */
export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  delayMs = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return true;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    const node = ref.current;
    if (isVisible || !node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    observeElement(node, () => setIsVisible(true));
    return () => unobserveElement(node);
  }, [isVisible]);

  return (
    <div
      ref={ref}
      style={isVisible && delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
      className={`${isVisible ? 'animate-reveal-up' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {children}
    </div>
  );
};
