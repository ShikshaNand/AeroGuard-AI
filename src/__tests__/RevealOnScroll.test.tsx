import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RevealOnScroll } from '../components/RevealOnScroll';

describe('RevealOnScroll shared IntersectionObserver pool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shares one IntersectionObserver across multiple instances and reveals on intersection', () => {
    let constructorCalls = 0;
    let observerCallback: IntersectionObserverCallback | null = null;
    const observed = new Set<Element>();
    const disconnectSpy = vi.fn();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [0.08];

      constructor(cb: IntersectionObserverCallback) {
        constructorCalls += 1;
        observerCallback = cb;
      }
      observe(el: Element) {
        observed.add(el);
      }
      unobserve(el: Element) {
        observed.delete(el);
      }
      disconnect() {
        observed.clear();
        disconnectSpy();
      }
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const { unmount } = render(
      <>
        <RevealOnScroll delayMs={50}>
          <p>Section A</p>
        </RevealOnScroll>
        <RevealOnScroll delayMs={100}>
          <p>Section B</p>
        </RevealOnScroll>
      </>
    );

    // Only ONE shared observer instance should be created for both wrappers
    expect(constructorCalls).toBe(1);
    expect(observed.size).toBe(2);

    const [firstTarget] = Array.from(observed);
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: firstTarget } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(screen.getByText('Section A').parentElement?.className).toContain('animate-reveal-up');

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
