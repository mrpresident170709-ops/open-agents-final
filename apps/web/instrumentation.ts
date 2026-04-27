import { validateEnvOrDie, getEnv, isVercelSandboxConfigured, isVercelOAuthConfigured, isGitHubAppConfigured, isDatabaseConfigured, isEncryptionConfigured } from "@/lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  validateEnvOrDie();

  const env = getEnv();

  if (!env.VERCEL_TOKEN && env.VERCEL_ACCESS_TOKEN) {
    process.env.VERCEL_TOKEN = env.VERCEL_ACCESS_TOKEN;
    console.log(
      "[instrumentation] Aliased VERCEL_ACCESS_TOKEN → VERCEL_TOKEN for @vercel/sandbox SDK.",
    );
  }

  console.log("[instrumentation] Environment configuration:");
  console.log(`  - Database: ${isDatabaseConfigured() ? "✓ configured" : "✗ missing"}`);
  console.log(`  - Encryption: ${isEncryptionConfigured() ? "✓ configured" : "✗ missing"}`);
  console.log(`  - Vercel OAuth: ${isVercelOAuthConfigured() ? "✓ configured" : "✗ not configured"}`);
  console.log(`  - GitHub App: ${isGitHubAppConfigured() ? "✓ configured" : "✗ not configured"}`);
  console.log(`  - Node ENV: ${env.NODE_ENV || "not set"}`);

  // Sandbox configuration detail
  const sandboxToken = env.VERCEL_TOKEN || env.VERCEL_ACCESS_TOKEN || env.VERCEL_OIDC_TOKEN;
  const sandboxTokenSource = env.VERCEL_TOKEN
    ? "VERCEL_TOKEN"
    : env.VERCEL_ACCESS_TOKEN
      ? "VERCEL_ACCESS_TOKEN"
      : env.VERCEL_OIDC_TOKEN
        ? "VERCEL_OIDC_TOKEN (Compute Credentials)"
        : null;
  const localSandbox = !!process.env.REPL_ID;

  if (localSandbox) {
    console.log("  - Sandbox: ✓ local filesystem (Replit dev environment)");
  } else if (isVercelSandboxConfigured()) {
    console.log(`  - Sandbox: ✓ Vercel (token=${sandboxTokenSource} team=${env.VERCEL_TEAM_ID} project=${env.VERCEL_PROJECT_ID})`);
  } else {
    const missing: string[] = [];
    if (!sandboxToken) missing.push("VERCEL_TOKEN or VERCEL_OIDC_TOKEN");
    if (!env.VERCEL_TEAM_ID) missing.push("VERCEL_TEAM_ID");
    if (!env.VERCEL_PROJECT_ID) missing.push("VERCEL_PROJECT_ID");
    console.log(`  - Sandbox: ✗ not configured (missing: ${missing.join(", ")})`);
    console.log(
      "    → To fix: enable 'Compute Credentials' (OIDC) in your Vercel project settings,",
    );
    console.log(
      "      or set VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID as env vars.",
    );
  }
}
