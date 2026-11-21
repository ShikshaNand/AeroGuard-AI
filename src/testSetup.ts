import '@testing-library/jest-dom/vitest';

// Silence JSDOM's unimplemented canvas getContext notice triggered by axe-core icon checks
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
