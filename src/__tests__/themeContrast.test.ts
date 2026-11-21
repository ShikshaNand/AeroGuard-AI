import { describe, it, expect } from 'vitest';
import indexCss from 'virtual:theme-css';

/**
 * Mathematical WCAG 2.1 AA Color Contrast Verification
 * Parses `:root` (Light Beige) and `body.dark-theme` (Midnight Espresso Dark)
 * CSS custom property hex values from `src/index.css` and asserts >= 4.5:1
 * contrast ratios across every primary text/surface pair.
 */

function parseCssVars(css: string, blockSelector: string): Record<string, string> {
  const escaped = blockSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) return {};
  const vars: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/);
    if (m) {
      vars[m[1]] = m[2];
    }
  }
  return vars;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const srgb = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('WCAG 2.1 AA theme color contrast verification', () => {
  const light = parseCssVars(indexCss, ':root');
  const dark = parseCssVars(indexCss, 'body.dark-theme');

  const pairs: Array<[string, string]> = [
    ['--text-primary', '--surface-page'],
    ['--text-primary', '--surface-panel'],
    ['--text-body', '--surface-panel'],
    ['--text-secondary', '--surface-panel'],
    ['--text-muted', '--surface-panel'],
    ['--text-subtle', '--surface-panel'],
    ['--text-on-brand', '--accent-brand'],
    ['--text-brand', '--surface-sage'],
    ['--text-danger', '--surface-terracotta'],
    ['--text-warn', '--surface-amber'],
    ['--aqi-good-fg', '--aqi-good-bg'],
    ['--aqi-mod-fg', '--aqi-mod-bg'],
    ['--aqi-haz-fg', '--aqi-haz-bg'],
  ];

  it('meets WCAG 2.1 AA (>= 4.5:1) for all Light Beige theme token pairs', () => {
    for (const [fg, bg] of pairs) {
      expect(light[fg], `Missing light token ${fg}`).toBeDefined();
      expect(light[bg], `Missing light token ${bg}`).toBeDefined();
      const ratio = contrastRatio(light[fg], light[bg]);
      expect(ratio, `Light contrast ${fg} on ${bg} was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets WCAG 2.1 AA (>= 4.5:1) for all Midnight Espresso Dark theme token pairs', () => {
    for (const [fg, bg] of pairs) {
      expect(dark[fg], `Missing dark token ${fg}`).toBeDefined();
      expect(dark[bg], `Missing dark token ${bg}`).toBeDefined();
      const ratio = contrastRatio(dark[fg], dark[bg]);
      expect(ratio, `Dark contrast ${fg} on ${bg} was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
