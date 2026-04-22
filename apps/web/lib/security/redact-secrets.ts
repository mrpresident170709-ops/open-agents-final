/**
 * Runtime secret redaction layer.
 *
 * Principles:
 * - Env variables are WRITE-ONLY at runtime. Values must never appear in logs,
 *   API responses, or any user-visible output.
 * - We build a redaction set at startup from process.env names that look like
 *   secrets, then patch global console methods so any accidental leak is
 *   replaced with [REDACTED] before it hits stdout/stderr.
 * - API routes that must return env-derived data (e.g. a list of configured
 *   keys) should return ONLY key names, never values.
 */

/** Pattern that identifies likely-secret env var names. */
const SECRET_NAME_PATTERN =
  /KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|PRIVATE|AUTH|API_/i;

/** Minimum length for a value to be treated as a secret (avoids redacting "true", "1", etc.) */
const MIN_SECRET_LENGTH = 8;

/** Placeholder used in place of any detected secret value. */
export const REDACTED = "[REDACTED]";

/**
 * Build the set of secret values to redact.
 * Called once at startup — captures the snapshot of process.env at that time.
 * Any env var added after startup won't be in the set; call `refreshRedactSet`
 * after dynamic env mutations.
 */
function buildRedactSet(): Set<string> {
  const values = new Set<string>();
  for (const [name, value] of Object.entries(process.env)) {
    if (
      value &&
      value.length >= MIN_SECRET_LENGTH &&
      SECRET_NAME_PATTERN.test(name)
    ) {
      values.add(value);
    }
  }
  return values;
}

let _redactSet: Set<string> = buildRedactSet();
let _redactPatterns: RegExp | null = null;

/** Call after dynamically setting new env vars to update the redact set. */
export function refreshRedactSet(): void {
  _redactSet = buildRedactSet();
  _redactPatterns = null; // reset compiled pattern
}

function getRedactPattern(): RegExp | null {
  if (_redactSet.size === 0) return null;
  if (_redactPatterns) return _redactPatterns;

  // Escape special regex chars in each secret value, then join with |
  const escaped = Array.from(_redactSet)
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length); // longer values first (greedy)

  _redactPatterns = new RegExp(escaped.join("|"), "g");
  return _redactPatterns;
}

/**
 * Redact any known secret values from a string.
 * Safe to call with non-string input — non-strings are returned unchanged.
 */
export function redact(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const pattern = getRedactPattern();
  if (!pattern) return value;
  // Reset lastIndex for global regexes
  pattern.lastIndex = 0;
  return value.replace(pattern, REDACTED);
}

/**
 * Redact all string arguments passed to a console method.
 */
function redactArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "string") return redact(arg);
    if (arg && typeof arg === "object") {
      try {
        const str = JSON.stringify(arg);
        const redacted = redact(str);
        if (redacted !== str) {
          return JSON.parse(redacted as string);
        }
      } catch {
        // Non-serializable object — leave as-is (no secret values can escape as strings)
      }
    }
    return arg;
  });
}

let _consolePatchApplied = false;

/**
 * Patch global console methods (log, info, warn, error, debug) to
 * automatically redact known secret values from all arguments.
 *
 * Idempotent — safe to call multiple times.
 */
export function patchConsoleForSecretRedaction(): void {
  if (_consolePatchApplied) return;
  _consolePatchApplied = true;

  const methods = ["log", "info", "warn", "error", "debug"] as const;
  for (const method of methods) {
    const original = console[method].bind(console);
    // @ts-expect-error — intentionally replacing console methods
    console[method] = (...args: unknown[]) => {
      original(...redactArgs(args));
    };
  }
}

/**
 * Sanitize a plain object before sending it as an API response.
 * Recursively replaces any string values that contain secret data with [REDACTED].
 * Use this on any object derived from external input or env config before returning it.
 */
export function sanitizeForResponse<T>(value: T): T {
  if (typeof value === "string") {
    return redact(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForResponse) as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = sanitizeForResponse(v);
    }
    return result as T;
  }
  return value;
}

/**
 * Assert that no known secret values appear in a string intended for the client.
 * Throws in development; logs a warning in production.
 * Use this on any string that will be sent to the browser.
 */
export function assertNoSecrets(value: string, context = "response"): void {
  const pattern = getRedactPattern();
  if (!pattern) return;
  pattern.lastIndex = 0;
  if (pattern.test(value)) {
    const msg = `[security] Secret value detected in ${context}. This is a bug — never send secret values to the client.`;
    if (process.env.NODE_ENV === "development") {
      throw new Error(msg);
    } else {
      console.error(msg);
    }
  }
}
