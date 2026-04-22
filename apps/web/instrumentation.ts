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
