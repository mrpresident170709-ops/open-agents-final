/**
 * Secret redaction system for sandbox stdout/stderr.
 *
 * The Vercel sandbox returns command output (stdout + stderr) that the agent
 * sees as tool results AND that gets persisted in chat history. If user code
 * ever does `console.log(process.env.OPENAI_API_KEY)` — even once, even by
 * accident — the raw secret would leak into the model context, the database,
 * and any downstream logs.
 *
 * This module produces a `redact()` function bound to the actual decrypted
 * secret values for the current run. Every exec result flows through it
 * before reaching the agent or being persisted.
 *
 * Defense in depth: in addition to scrubbing known secret values verbatim,
 * we also pattern-match common credential shapes (sk-*, eyJ* JWTs, AKIA*
 * AWS keys, ghp_/gho_/ghs_ GitHub tokens) so secrets the user never told us
 * about still get redacted if they happen to flow through stdout.
 */

// Minimum length for a value to be worth scrubbing. Values shorter than this
// are too likely to produce false-positive matches (e.g. a secret value of
// "1" would scrub every digit "1" in command output).
const MIN_VALUE_LEN = 8;

// Patterns that look like credentials regardless of source.
const CREDENTIAL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "OPENAI_KEY", pattern: /\bsk-[A-Za-z0-9_-]{20,}/g },
  { name: "ANTHROPIC_KEY", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "GITHUB_TOKEN", pattern: /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}/g },
  { name: "AWS_KEY", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "STRIPE_KEY", pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { name: "SLACK_TOKEN", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
];

export type SecretMap = Record<string, string>;

export interface Redactor {
  /** Scrub a single string. Safe to call on any string, including empty. */
  redact(input: string): string;
  /** Number of named secrets this redactor knows about. */
  readonly secretCount: number;
  /** Whether this redactor would do anything (false = passthrough). */
  readonly isActive: boolean;
}

/**
 * Build a redactor for the given decrypted secret map.
 *
 * The returned function replaces:
 *   - Each secret value with `[REDACTED:NAME]` (longest values first to
 *     avoid partial overlaps when one secret is a substring of another)
 *   - Pattern-matched credentials (sk-..., eyJ..., AKIA..., etc.) with
 *     `[REDACTED:PATTERN_NAME]`
 */
export function createRedactor(secrets: SecretMap): Redactor {
  // Index secrets by their value, filtering out short/empty entries that
  // would over-match. Sort longest-first so substring overlaps redact
  // the larger value before the smaller one.
  const entries = Object.entries(secrets)
    .filter(([, v]) => typeof v === "string" && v.length >= MIN_VALUE_LEN)
    .sort(([, a], [, b]) => b.length - a.length);

  const hasNamedSecrets = entries.length > 0;

  function redact(input: string): string {
    if (!input) return input;
    let out = input;

    // Phase 1: scrub known secret values verbatim.
    if (hasNamedSecrets) {
      for (const [name, value] of entries) {
        if (out.includes(value)) {
          // Use split/join to avoid building a regex from arbitrary user
          // input (which could contain regex metacharacters).
          out = out.split(value).join(`[REDACTED:${name}]`);
        }
      }
    }

    // Phase 2: scrub pattern-matched credentials (defense in depth).
    for (const { name, pattern } of CREDENTIAL_PATTERNS) {
      // Reset regex state since these are global regexes reused across calls.
      pattern.lastIndex = 0;
      if (pattern.test(out)) {
        pattern.lastIndex = 0;
        out = out.replace(pattern, `[REDACTED:${name}]`);
      }
    }

    return out;
  }

  return {
    redact,
    secretCount: entries.length,
    isActive: true, // pattern phase always runs even with zero named secrets
  };
}
