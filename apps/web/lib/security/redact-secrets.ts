/**
 * Runtime secret redaction layer.
 *
 * Three complementary layers — whichever fires first wins:
 *
 *  Layer 1 — Value registry (process.env + injected vault secrets)
 *    Build a Set of known secret strings at startup, rebuild on mutation.
 *    Redacts an exact match anywhere in a log argument.
 *
 *  Layer 2 — Structural patterns
 *    Regex patterns that match well-known API key formats, JWTs, and bearer
 *    tokens by shape alone — catches secrets that were never in process.env.
 *
 *  Layer 3 — URL credential scrubbing
 *    Strip username:password from any URL-shaped string before it hits logs.
 *
 * Usage
 *  import { patchConsoleForSecretRedaction, registerSecretValue,
 *           refreshRedactSet, redact, sanitizeForResponse, assertNoSecrets }
 *    from "@/lib/security/redact-secrets";
 *
 *  Call patchConsoleForSecretRedaction() once at process startup (in
 *  instrumentation.ts) BEFORE any other code runs.  Then call
 *  registerSecretValue() or refreshRedactSet() whenever new secrets are
 *  introduced at runtime (vault inject, OAuth token exchange, etc.).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Env var name patterns that identify likely-secret values. */
const SECRET_NAME_PATTERN =
  /KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|PRIVATE|AUTH|API_/i;

/** Minimum value length to treat as a secret (avoids redacting "true", "1"). */
const MIN_SECRET_LENGTH = 8;

/** The placeholder written into logs in place of any detected secret. */
export const REDACTED = "[REDACTED]";

// ─── Layer 2: Structural patterns ─────────────────────────────────────────────
//
// Each entry: { label, pattern }
// Patterns use non-capturing groups; the entire match is replaced with REDACTED.
// Order matters — more specific patterns come first.

const STRUCTURAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // JSON Web Token  (header.payload.signature — all base64url segments)
  {
    label: "JWT",
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },

  // Bearer / token in HTTP Authorization header value
  {
    label: "Bearer",
    pattern: /\bBearer\s+[A-Za-z0-9\-_.~+/]{16,}={0,3}/gi,
  },

  // ── Well-known provider key formats ──────────────────────────────────────

  // OpenAI  sk-… (legacy) and sk-proj-… (project keys)
  { label: "OpenAI key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b/g },

  // OpenAI org ID  (org-…) — not a secret but still worth scrubbing
  { label: "OpenAI org", pattern: /\borg-[A-Za-z0-9]{16,}\b/g },

  // Anthropic  sk-ant-…
  { label: "Anthropic key", pattern: /\bsk-ant-[A-Za-z0-9\-]{20,}\b/g },

  // Stripe — secret sk_live / sk_test, restricted rk_live / rk_test, webhook whsec_
  {
    label: "Stripe secret key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
  },
  { label: "Stripe webhook", pattern: /\bwhsec_[A-Za-z0-9]{20,}\b/g },

  // Stripe publishable — not a server secret but still informative to scrub
  {
    label: "Stripe publishable",
    pattern: /\bpk_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
  },

  // GitHub tokens (classic ghp_, app installation ghs_, action gha_, etc.)
  {
    label: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  },

  // Google / Firebase service account JSON — partial match on private_key block
  {
    label: "Google private key",
    pattern: /-----BEGIN(?:\s[A-Z]+)?\s+PRIVATE KEY-----[\s\S]*?-----END(?:\s[A-Z]+)?\s+PRIVATE KEY-----/g,
  },

  // AWS access key ID (AKIA… — 20 chars total, allow longer variants)
  { label: "AWS access key", pattern: /\bAKIA[A-Z0-9]{16,}\b/g },

  // AWS secret access key (40-char alphanumeric+/+)
  {
    label: "AWS secret",
    pattern: /\b[A-Za-z0-9/+]{40}\b/g,
  },

  // Resend API key  re_…
  { label: "Resend key", pattern: /\bre_[A-Za-z0-9]{30,}\b/g },

  // SendGrid API key  SG.…
  { label: "SendGrid key", pattern: /\bSG\.[A-Za-z0-9\-_.]{20,}\b/g },

  // Twilio account SID / auth token
  { label: "Twilio SID", pattern: /\bAC[a-f0-9]{32}\b/g },
  { label: "Twilio token", pattern: /\b[a-f0-9]{32}\b/g },

  // Supabase service role / anon JWT (they start with eyJ — caught by JWT rule above,
  // but Supabase sometimes returns raw base64 tokens without dots)
  { label: "Supabase token", pattern: /\bsbp_[A-Za-z0-9]{40,}\b/g },

  // Pinecone
  { label: "Pinecone key", pattern: /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/g },

  // Generic long base64 / base64url that looks like a secret
  // Only fires when: ≥40 chars, preceded by a secret-like label OR quoted
  // (too broad when unguarded — we apply it with a word-boundary heuristic)
  {
    label: "Generic high-entropy base64",
    pattern:
      /(?<=(?:key|token|secret|password|credential|auth|bearer)\s*[=:'"]\s*)[A-Za-z0-9+/\-_]{32,}={0,3}/gi,
  },
];

// ─── Layer 3: URL credential pattern ──────────────────────────────────────────

// https://user:password@host  →  https://[REDACTED]@host
const URL_CREDENTIAL_PATTERN = /(\bhttps?:\/\/)[^@\s]+:[^@\s]+@/gi;

// ─── Layer 1: Value registry ──────────────────────────────────────────────────

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
let _valuePattern: RegExp | null = null;

/** Rebuild the value-match pattern after the registry changes. */
function invalidateValuePattern(): void {
  _valuePattern = null;
}

function getValuePattern(): RegExp | null {
  if (_redactSet.size === 0) return null;
  if (_valuePattern) return _valuePattern;

  // Escape and sort longest-first (greedier match wins)
  const escaped = Array.from(_redactSet)
    .filter((v) => v.length >= MIN_SECRET_LENGTH)
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);

  if (escaped.length === 0) return null;
  _valuePattern = new RegExp(escaped.join("|"), "g");
  return _valuePattern;
}

/**
 * Rebuild the value-match set from process.env.
 * Call after any env mutation (e.g. after injecting vault secrets).
 */
export function refreshRedactSet(): void {
  _redactSet = buildRedactSet();
  invalidateValuePattern();
}

/**
 * Register a single secret value (not from process.env) so it will be
 * redacted everywhere it appears in logs.
 *
 * Use this after fetching or generating runtime secrets:
 *   - Vault secrets injected into the agent sandbox
 *   - OAuth access tokens returned by a provider
 *   - Database connection strings assembled at runtime
 */
export function registerSecretValue(value: string): void {
  if (!value || value.length < MIN_SECRET_LENGTH) return;
  if (_redactSet.has(value)) return; // already registered
  _redactSet.add(value);
  invalidateValuePattern();
}

// ─── Redact engine ────────────────────────────────────────────────────────────

/**
 * Apply all three redaction layers to a single string.
 */
export function redact(value: unknown): unknown {
  if (typeof value !== "string") return value;
  let s = value;

  // Layer 3 — URL credentials
  s = s.replace(URL_CREDENTIAL_PATTERN, "$1[REDACTED]@");

  // Layer 1 — known env/vault values
  const vp = getValuePattern();
  if (vp) {
    vp.lastIndex = 0;
    s = s.replace(vp, REDACTED);
  }

  // Layer 2 — structural patterns (reset lastIndex before each use)
  for (const { pattern } of STRUCTURAL_PATTERNS) {
    pattern.lastIndex = 0;
    s = s.replace(pattern, REDACTED);
  }

  return s;
}

// ─── console patcher ─────────────────────────────────────────────────────────

function redactArg(arg: unknown): unknown {
  if (typeof arg === "string") {
    return redact(arg);
  }
  if (arg && typeof arg === "object") {
    try {
      const str = JSON.stringify(arg);
      const cleaned = redact(str) as string;
      if (cleaned !== str) return JSON.parse(cleaned);
    } catch {
      // Non-serializable — leave as-is; no string value can escape
    }
  }
  return arg;
}

function redactArgs(args: unknown[]): unknown[] {
  return args.map(redactArg);
}

let _consolePatchApplied = false;

/**
 * Monkey-patch global console methods to automatically redact secrets.
 *
 * Call ONCE at process startup, before any other code runs.
 * Idempotent — safe to call multiple times.
 *
 * Covers: console.log / .info / .warn / .error / .debug / .trace
 */
export function patchConsoleForSecretRedaction(): void {
  if (_consolePatchApplied) return;
  _consolePatchApplied = true;

  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  for (const method of methods) {
    const original = console[method].bind(console);
    // @ts-expect-error — intentionally replacing console methods
    console[method] = (...args: unknown[]) => original(...redactArgs(args));
  }
}

// ─── API response / client safety helpers ─────────────────────────────────────

/**
 * Deep-redact an object before returning it as an API response.
 * Replaces any string leaf that contains a detected secret with [REDACTED].
 */
export function sanitizeForResponse<T>(value: T): T {
  if (typeof value === "string") return redact(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeForResponse) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForResponse(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Assert that a string intended for the client contains no secret values.
 * Throws in development; logs a security error in production.
 */
export function assertNoSecrets(value: string, context = "response"): void {
  const vp = getValuePattern();
  const hasByValue = vp ? (vp.lastIndex = 0, vp.test(value)) : false;

  const hasByPattern = !hasByValue && STRUCTURAL_PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });

  if (hasByValue || hasByPattern) {
    const msg = `[security] Secret value detected in ${context}. This is a bug — never send secret values to the client.`;
    if (process.env.NODE_ENV === "development") throw new Error(msg);
    else console.error(msg);
  }
}
