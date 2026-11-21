/// <reference types="vitest" />
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

export default defineConfig({
  plugins: [react(), tailwindcss(), devFastRefreshCspPlugin],
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
      include: ['src/**/*.{ts,tsx}'],
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
