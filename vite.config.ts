/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { env as nodeEnv } from 'node:process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Allows Vite's React Fast Refresh inline preamble during local `npm run dev`
 * while keeping the strict `script-src 'self'` CSP untouched in `index.html`
 * and production builds (`dist/index.html`).
 */
const devFastRefreshCspPlugin: Plugin = {
  name: 'dev-fast-refresh-csp',
  apply: 'serve',
  transformIndexHtml(html) {
    return html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';");
  },
};

/**
 * Exposes raw `src/index.css` source to Vitest contrast-ratio tests without
 * triggering Tailwind CSS compilation (never imported by production app code).
 */
const rawThemeCssVirtualPlugin: Plugin = {
  name: 'raw-theme-css-virtual',
  resolveId(id) {
    if (id === 'virtual:theme-css') return '\0virtual:theme-css';
    return null;
  },
  load(id) {
    if (id === '\0virtual:theme-css') {
      const css = readFileSync(new URL('./src/index.css', import.meta.url), 'utf8');
      return `export default ${JSON.stringify(css)};`;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), devFastRefreshCspPlugin, rawThemeCssVirtualPlugin],
  // On Vercel deployments, keep VITE_GEMINI_API_KEY strictly server-side inside /api/gemini
  // so it is never bundled into public client JavaScript even without renaming the env var.
  define: nodeEnv.VERCEL
    ? { 'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify('') }
    : undefined,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/types/**',
        'src/main.tsx',
        'src/testSetup.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        statements: 80,
      },
    },
  },
});
