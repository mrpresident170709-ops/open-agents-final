/**
 * Node.js-only instrumentation.
 *
 * Called from instrumentation.ts ONLY when NEXT_RUNTIME === 'nodejs'.
 * Safe to import Node.js built-ins (crypto, fs, etc.) here — this file
 * is never bundled into the Edge runtime.
 */

/**
 * Re-encrypt any legacy AES-256-CBC secrets to AES-256-GCM.
 * Runs in the background — does not block the first request.
 * Idempotent: rows already in v2 GCM format are skipped with no DB write.
 */
export async function runStartupMigrations(): Promise<void> {
  if (!process.env.ENCRYPTION_KEY) return;

  try {
    const { migrateSecretsToGcm } = await import("@/lib/db/user-secrets");
    await migrateSecretsToGcm();
  } catch (err) {
    console.error("[instrumentation] CBC→GCM migration error:", err);
  }
}
