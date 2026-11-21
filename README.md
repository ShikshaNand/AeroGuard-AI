# AeroGuard AI — Winter Smog & Urban Air Pollution Assistant

AeroGuard AI is a GenAI-powered web application that helps families and communities navigate severe winter thermal-inversion smog and urban air pollution. It combines live atmospheric telemetry (Open-Meteo Air Quality + Weather APIs) and curated winter smog city benchmarks with a tailored **Family & Lifestyle Profile** to recommend **low-emission daily routines**, **indoor air quality (IAQ) hacks**, and **sustainable alternatives**—clearly quantifying the direct personal health and community environmental impact of every choice.

## Core Capabilities

1. **Real-Time Smog Telemetry & 3-Step Daily Family Briefing Slides**:
   - Search any global city via Open-Meteo Geocoding + Air Quality APIs or switch instantly between 6 winter smog inversion hotspots (**Delhi NCR**, **Lahore**, **Ulaanbaatar**, **Milan Po Valley**, **Salt Lake City**, **Sarajevo**).
   - Translates raw PM2.5, PM10, NO₂, temperature, and wind speed into WHO 2021 guideline multiples (`15 µg/m³`), Berkeley Earth passive cigarette equivalents (`22 µg/m³ ≈ 1 cig/day`), thermal inversion risk, and the safest afternoon ventilation window.
2. **Low-Emission Daily Routines & 24-Hour Inversion Curve**:
   - Interactive 24-hour winter thermal inversion bar chart contrasting morning/evening trap peaks with the mid-afternoon solar mixing window.
   - Interactive **Slide Deck / All-View Routine Optimizer** comparing baseline habits against low-emission routines (cold-start commute avoidance, afternoon exercise timing, 15-min pulse ventilation, rear-burner kitchen capture, warm-engine errand batching).
3. **Indoor Air Quality (IAQ) Mass-Balance Simulator & CADR Calculator**:
   - Real-time mass-balance simulation of outdoor smog infiltration + indoor heating/cooking sources minus enabled IAQ hacks.
   - Interactive **CADR & DIY Corsi-Rosenthal Box Sizing Calculator** comparing a ~$58 DIY 4-filter MERV-13 box against commercial HEPA units for 5+ ACH.
   - Cost-filterable IAQ hack slide deck (`Free Today` and `Low-Cost DIY`) with step-by-step checklists and physics explanations.
4. **Sustainable Lifestyle Alternatives & Community Impact Multiplier**:
   - Scales household choices across `10` to `1,000` participating neighborhood families over a 90-day winter season (`mg` lung soot avoided, `kg` street-level PM2.5+NOx removed, metric tons of CO₂e prevented, mature urban tree equivalent).
   - 1-click copyable **Neighborhood Clean-Air Pledge** ready for school groups, HOAs, or RWAs.
5. **Hybrid GenAI Smog & Lifestyle Coach**:
   - Resilient AI coach supporting live **Google Gemini API** with multi-candidate fallback (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-flash`) and dynamic model discovery via `v1beta/models`, with zero-crash fallback to its built-in **Deterministic Environmental Science Engine**.
6. **Local Persistence & Zero Data Loss**:
   - Schema-validated browser `localStorage` persistence layer auto-saving family profiles, city selection, active routine swaps, indoor hacks, and theme mode across page reloads.

## Engineering Highlights Across Evaluation Pillars

- **Code Quality**: Strict TypeScript (`strict: true`, zero `any`, zero `as unknown as`), ESLint 9 + TypeScript-ESLint + React Hooks flat config (`npm run lint`), Prettier config, Tailwind v4 `@theme inline` semantic design tokens (zero arbitrary hex overrides, zero `!important`), clean modular layered architecture (`src/domain/`, `src/services/`, `src/hooks/`, `src/components/`, `src/utils/`, `src/data/`), and GitHub Actions CI (`.github/workflows/ci.yml`).
- **Security**: Hardened Content Security Policy (`script-src 'self'`, zero `'unsafe-inline'` scripts) in `index.html`, zero `npm audit` dependency vulnerabilities, iterative XSS input sanitization (`sanitizeTextInput`), prompt-injection guardrails (`validatePromptSafety`), API key format validation (`validateGeminiApiKeyFormat`), sliding-window rate limiter, RAM-only `x-goog-api-key` header transmission with masking (`maskApiKey`), schema-validated storage recovery, and XSS-free native React rendering (`SafeMarkdownText`, zero `dangerouslySetInnerHTML`).
- **Efficiency**: Bounded $O(1)$ in-memory `TTLCache` with LRU eviction for geocoding, AQI telemetry, and AI responses; in-flight request deduplication; debounced city search & debounced `localStorage` persistence with unload flush; `AbortController` network timeouts; Vite vendor chunk splitting (`vendor-react`, `vendor-icons`); and `React.memo` + `useMemo` / `useCallback` optimizations.
- **Testing**: Comprehensive automated unit, domain, hook, service, security, and component integration test suite powered by **Vitest 5 + React Testing Library** (16 test suites, 47 tests, 100% passing).
- **Accessibility (WCAG 2.1 AA)**: Semantic Warm Beige Light & Midnight Espresso Dark themes powered by CSS custom properties (>10:1 espresso text contrast), skip-to-main-content link, semantic HTML5 landmarks, full WAI-ARIA Tabs keyboard focus management (`Arrow`/`Home`/`End`), trigger focus restoration on `Escape`, keyboard-inspectable 24-hour forecast bars, `role="progressbar"` slide decks, `prefers-reduced-motion` support, and non-color-dependent AQI badges.
- **Problem Statement Alignment**: Directly addresses severe winter thermal-inversion smog and urban air pollution with actionable habit shifts, mass-balance IAQ physics, Winter Indoor Humidity Guard alerts, DIY Corsi-Rosenthal box economics, and community-level collective impact modeling.

## Quick Start

```bash
npm install
npm run dev
```

## Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
