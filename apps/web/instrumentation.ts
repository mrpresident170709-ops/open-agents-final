import {
  patchConsoleForSecretRedaction,
  refreshRedactSet,
} from "@/lib/security/redact-secrets";

export async function register() {
  // ── Secret redaction ───────────────────────────────────────────────────
  // Patch console FIRST — before any other log line — so no secret value can
  // escape into stdout/stderr even during startup. Env vars whose names match
  // KEY|TOKEN|SECRET|PASSWORD|… are treated as write-only: their values are
  // replaced with [REDACTED] in all console output.
  patchConsoleForSecretRedaction();

  // ── CBC → GCM migration ────────────────────────────────────────────────
  // Re-encrypt any legacy AES-256-CBC secrets to AES-256-GCM.
  // Runs in the background — does not block the first request.
  // Safe to call on every startup: rows already in GCM format are skipped.
  if (process.env.ENCRYPTION_KEY) {
    // Dynamic import keeps this out of the Edge runtime bundle.
    import("@/lib/db/user-secrets")
      .then(({ migrateSecretsToGcm }) => migrateSecretsToGcm())
      .catch((err) => {
        console.error("[instrumentation] CBC→GCM migration error:", err);
      });
  }

  // ── Vercel SDK compatibility shim ─────────────────────────────────────
  if (!process.env.VERCEL_TOKEN && process.env.VERCEL_ACCESS_TOKEN) {
    process.env.VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;
    // Refresh after mutating env so the new value is also redacted.
    refreshRedactSet();
    console.log(
      "[instrumentation] Aliased VERCEL_ACCESS_TOKEN → VERCEL_TOKEN for @vercel/sandbox SDK.",
    );
  }

  console.log(
    `[instrumentation] Vercel Sandbox env: token=${
      process.env.VERCEL_TOKEN ? "set" : "missing"
    } team=${process.env.VERCEL_TEAM_ID ? "set" : "missing"} project=${
      process.env.VERCEL_PROJECT_ID ? "set" : "missing"
    }`,
  );
}
