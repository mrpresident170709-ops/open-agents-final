#!/usr/bin/env bun
/**
 * Environment Validation Script
 * Run with: bun run scripts/validate-env.ts
 *
 * Validates all environment variables and reports any issues.
 */

import { getEnv, getEnvValidationIssues, isDatabaseConfigured, isEncryptionConfigured, isVercelOAuthConfigured, isGitHubAppConfigured, isVercelSandboxConfigured } from "../apps/web/lib/env";

console.log("🔍 Open Harness Environment Validator\n");

const issues = getEnvValidationIssues();
const env = getEnv();

console.log("📋 Configuration Status:");
console.log(`  Database:           ${isDatabaseConfigured() ? "✅ configured" : "❌ missing"}`);
console.log(`  Encryption:         ${isEncryptionConfigured() ? "✅ configured" : "❌ missing"}`);
console.log(`  Vercel OAuth:       ${isVercelOAuthConfigured() ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  GitHub App:         ${isGitHubAppConfigured() ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  Vercel Sandbox:     ${isVercelSandboxConfigured() ? "✅ configured" : "⚠️  not configured"}`);
console.log("");

if (issues.length > 0) {
  console.log("⚠️  Validation Issues:");
  issues.forEach((issue) => {
    console.log(`  - ${issue.path}: ${issue.message}`);
  });
  console.log("");
}

// Check critical services
const criticalMissing: string[] = [];
if (!isDatabaseConfigured()) criticalMissing.push("POSTGRES_URL or DATABASE_URL");
if (!isEncryptionConfigured()) {
  if (!env.JWE_SECRET) criticalMissing.push("JWE_SECRET");
  if (!env.ENCRYPTION_KEY) criticalMissing.push("ENCRYPTION_KEY");
}

if (criticalMissing.length > 0) {
  console.log("❌ Critical Configuration Missing:");
  criticalMissing.forEach((item) => console.log(`  - ${item}`));
  console.log("\n💡 Copy .env.example to .env and fill in the values:");
  console.log("   cp apps/web/.env.example apps/web/.env\n");
  process.exit(1);
}

// Report optional services
console.log("🔧 Optional Services:");
console.log(`  Redis:              ${env.REDIS_URL || env.KV_URL ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  Anthropic API:      ${env.ANTHROPIC_API_KEY ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  OpenAI API:         ${env.OPENAI_API_KEY ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  Together AI:         ${env.TOGETHER_API_KEY ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  Firecrawl:          ${env.FIRECRAWL_API_KEY ? "✅ configured" : "⚠️  not configured"}`);
console.log(`  Exa:                ${env.EXA_API_KEY ? "✅ configured" : "⚠️  not configured"}`);
console.log("");

console.log("✅ Environment validation complete!");
console.log("\n💡 Tips:");
console.log("  - Add API keys to enable AI features");
console.log("  - Configure GitHub App for repository access");
console.log("  - Configure Vercel for sandbox features");
console.log("  - Users can also set per-user secrets in /settings/secrets\n");
