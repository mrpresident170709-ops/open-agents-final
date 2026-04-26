import { validateEnvOrDie, getEnv, isVercelSandboxConfigured, isVercelOAuthConfigured, isGitHubAppConfigured, isDatabaseConfigured, isEncryptionConfigured } from "@/lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  // Validate environment variables at startup
  validateEnvOrDie();

  const env = getEnv();

  // Handle VERCEL_TOKEN aliasing (for backward compatibility)
  if (!env.VERCEL_TOKEN && env.VERCEL_ACCESS_TOKEN) {
    process.env.VERCEL_TOKEN = env.VERCEL_ACCESS_TOKEN;
    console.log(
      "[instrumentation] Aliased VERCEL_ACCESS_TOKEN → VERCEL_TOKEN for @vercel/sandbox SDK.",
    );
  }

  // Log configuration status (non-sensitive)
  console.log("[instrumentation] Environment configuration:");
  console.log(`  - Database: ${isDatabaseConfigured() ? "✓ configured" : "✗ missing"}`);
  console.log(`  - Encryption: ${isEncryptionConfigured() ? "✓ configured" : "✗ missing"}`);
  console.log(`  - Vercel OAuth: ${isVercelOAuthConfigured() ? "✓ configured" : "✗ not configured"}`);
  console.log(`  - GitHub App: ${isGitHubAppConfigured() ? "✓ configured" : "✗ not configured"}`);
  console.log(`  - Vercel Sandbox: ${isVercelSandboxConfigured() ? "✓ configured" : "✗ not configured"}`);
  console.log(`  - Node ENV: ${env.NODE_ENV || "not set"}`);

  // Log Vercel Sandbox details if configured
  if (isVercelSandboxConfigured()) {
    console.log(
      `[instrumentation] Vercel Sandbox: team=${env.VERCEL_TEAM_ID} project=${env.VERCEL_PROJECT_ID}`,
    );
  }
}
