/**
 * Security & Input Sanitization Utilities
 * Protects against XSS injection, control-character payloads, prompt injection attempts,
 * API credential exposure, and excessive client-side request bursts.
 */

const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;
const DANGEROUS_SCHEME_REGEX = /(javascript|data|vbscript)\s*:/gi;
const EVENT_HANDLER_REGEX = /\bon\w+\s*=/gi;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|system)\s+prompt/i,
  /reveal\s+(your\s+|the\s+)?system\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /\bact\s+as\s+(a\s+)?dan\b/i,
  /<script[\s>]/i,
  /onerror\s*=/i,
];

/**
 * Sanitizes free-form user text by stripping HTML tags (iteratively to prevent nested bypasses),
 * dangerous URI schemes, inline event handlers, and non-printable control characters,
 * and truncating to a safe maximum length.
 */
export function sanitizeTextInput(input: string, maxLength = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  let cleaned = input.replace(CONTROL_CHARS_REGEX, '');
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(HTML_TAG_REGEX, '')
      .replace(DANGEROUS_SCHEME_REGEX, '')
      .replace(EVENT_HANDLER_REGEX, '');
  }

  return cleaned.trim().slice(0, Math.max(1, maxLength));
}

/**
 * Validates and clamps geographic coordinates to valid WGS84 bounds.
 */
export function validateCoordinates(
  latitude: number,
  longitude: number
): { latitude: number; longitude: number } {
  const safeLat = Number.isFinite(latitude) ? Math.max(-90, Math.min(90, latitude)) : 0;
  const safeLon = Number.isFinite(longitude) ? Math.max(-180, Math.min(180, longitude)) : 0;
  return {
    latitude: Number(safeLat.toFixed(4)),
    longitude: Number(safeLon.toFixed(4)),
  };
}

export interface PromptValidationResult {
  isValid: boolean;
  sanitizedPrompt: string;
  reason?: string;
}

/**
 * Validates and sanitizes a user prompt destined for the GenAI assistant.
 */
export function validatePromptSafety(rawPrompt: string, maxLength = 600): PromptValidationResult {
  if (typeof rawPrompt !== 'string' || rawPrompt.trim().length === 0) {
    return {
      isValid: false,
      sanitizedPrompt: '',
      reason: 'Please enter a question or select a suggested topic.',
    };
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(rawPrompt)) {
      return {
        isValid: false,
        sanitizedPrompt: '',
        reason:
          'Your input contains disallowed instruction-override or script patterns. Please ask a question about air quality, routines, or sustainability.',
      };
    }
  }

  const sanitizedPrompt = sanitizeTextInput(rawPrompt, maxLength);
  if (sanitizedPrompt.length < 2) {
    return {
      isValid: false,
      sanitizedPrompt,
      reason: 'Please enter a valid question (at least 2 characters).',
    };
  }

  return {
    isValid: true,
    sanitizedPrompt,
  };
}

/**
 * Safely masks an API key for UI confirmation without exposing raw secret bytes.
 */
export function maskApiKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== 'string') {
    return '';
  }
  const trimmed = rawKey.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  return `${trimmed.slice(0, 3)}••••••••••••${trimmed.slice(-4)}`;
}

/**
 * Validates that a user-supplied Gemini API key looks structurally plausible
 * (no whitespace, safe ASCII token characters, reasonable length) without
 * rejecting future Google key prefixes.
 */
export function validateGeminiApiKeyFormat(rawKey: string): {
  isValid: boolean;
  reason?: string;
} {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    return { isValid: true };
  }
  if (/\s/.test(trimmed)) {
    return { isValid: false, reason: 'API keys cannot contain spaces.' };
  }
  if (trimmed.length < 16 || trimmed.length > 128) {
    return {
      isValid: false,
      reason: 'API key length looks invalid (expected 16–128 characters).',
    };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return {
      isValid: false,
      reason: 'API key contains unsupported characters.',
    };
  }
  return { isValid: true };
}

/**
 * Lightweight sliding-window rate limiter to protect external APIs from rapid spam.
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public tryAcquire(nowMs = Date.now()): boolean {
    const cutoff = nowMs - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }
    this.timestamps.push(nowMs);
    return true;
  }

  public reset(): void {
    this.timestamps = [];
  }
}
