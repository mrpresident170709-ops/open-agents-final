/**
 * Sandbox timeout configuration.
 * All timeout values are in milliseconds.
 */

/** Default timeout for new cloud sandboxes (5 hours) */
export const DEFAULT_SANDBOX_TIMEOUT_MS = 5 * 60 * 60 * 1000;

/** Manual extension duration for explicit fallback flows (20 minutes) */
export const EXTEND_TIMEOUT_DURATION_MS = 20 * 60 * 1000;

/** Inactivity window before lifecycle hibernates an idle sandbox (30 minutes) */
export const SANDBOX_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** Buffer for sandbox expiry checks (10 seconds) */
export const SANDBOX_EXPIRES_BUFFER_MS = 10 * 1000;

/** Grace window before treating a lifecycle run as stale (2 minutes) */
export const SANDBOX_LIFECYCLE_STALE_RUN_GRACE_MS = 2 * 60 * 1000;

/** Minimum sleep between lifecycle workflow loop iterations (5 seconds) */
export const SANDBOX_LIFECYCLE_MIN_SLEEP_MS = 5 * 1000;

/**
 * Default ports to expose from cloud sandboxes.
 * Limited to 5 ports. Covers the most common framework defaults
 * plus the built-in code editor:
 * - 3000: Next.js, Express, Remix
 * - 5173: Vite, SvelteKit
 * - 4321: Astro
 * - 8000: code-server (built-in editor)
 */
export const DEFAULT_SANDBOX_PORTS = [3000, 5173, 4321, 8000];
export const CODE_SERVER_PORT = 8000;

/** Default working directory for sandboxes, used for path display */
export const DEFAULT_WORKING_DIRECTORY = "/vercel/sandbox";

/**
 * Base snapshot for fresh cloud sandboxes.
 * - Current snapshot includes: bun + jq + agent-browser + chromium + code-server
 * - Previous snapshot includes: bun + jq + agent-browser + chromium
 */
/**
 * Base snapshot ID for the Vercel sandbox. The stock Open Harness snapshot
 * (`snap_EjsphVxi07bFKrfojljJdIS41KHT`) lives in the Open Harness Vercel team
 * and is not accessible from other teams — using a user-supplied VERCEL_TOKEN
 * with a different team will fail to create a sandbox from it.
 *
 * Behavior:
 * - If `VERCEL_SANDBOX_BASE_SNAPSHOT_ID` is set to a non-empty value, use it.
 * - If it's explicitly set to `"none"` or empty, skip the base snapshot and
 *   create a fresh sandbox (the agent will install bun/etc. on demand).
 * - Otherwise, fall back to the Open Harness default snapshot.
 */
function resolveBaseSnapshotId(): string | undefined {
  const raw = process.env.VERCEL_SANDBOX_BASE_SNAPSHOT_ID;
  if (!raw) {
    // No env var set → create a fresh sandbox with no base snapshot.
    // The Open Harness default snapshot (snap_EjsphVxi07bFKrfojljJdIS41KHT)
    // belongs to the original Open Harness Vercel team and is inaccessible to
    // other teams.  To use a pre-built snapshot, set this env var to your own
    // snapshot ID (create one via `npx vercel sandbox snapshot`).
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "none") {
    return undefined;
  }
  return trimmed;
}

export const DEFAULT_SANDBOX_BASE_SNAPSHOT_ID = resolveBaseSnapshotId();
