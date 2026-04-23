import { NextResponse } from "next/server";
import {
  getEnv,
  isDatabaseConfigured,
  isEncryptionConfigured,
  isVercelOAuthConfigured,
  isGitHubAppConfigured,
  isVercelSandboxConfigured,
  getEnvValidationIssues,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();
  const issues = getEnvValidationIssues();

  const checks = {
    database: isDatabaseConfigured(),
    encryption: isEncryptionConfigured(),
    vercelOAuth: isVercelOAuthConfigured(),
    githubApp: isGitHubAppConfigured(),
    vercelSandbox: isVercelSandboxConfigured(),
  };

  // Test database connection if configured
  let dbStatus: "connected" | "error" | "not_configured" = "not_configured";
  let dbError: string | undefined;

  if (checks.database) {
    try {
      const { db } = await import("@/lib/db/client");
      await db.execute("SELECT 1");
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "error";
      dbError = error instanceof Error ? error.message : String(error);
    }
  }

  // Test Redis connection if configured
  let redisStatus: "connected" | "error" | "not_configured" = "not_configured";
  let redisError: string | undefined;

  if (env.REDIS_URL || env.KV_URL) {
    try {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
      redisStatus = "connected";
    } catch (error) {
      redisStatus = "error";
      redisError = error instanceof Error ? error.message : String(error);
    }
  }

  const allHealthy = Object.values(checks).every(Boolean) && dbStatus === "connected";
  const status = allHealthy ? "healthy" : issues.length === 0 ? "degraded" : "unhealthy";

  const healthData = {
    status,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV || "not_set",
    checks: {
      ...checks,
      database: dbStatus,
      redis: redisStatus,
    },
    issues: issues.length > 0 ? issues : undefined,
    errors: {
      database: dbError,
      redis: redisError,
    },
  };

  const statusCode = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

  return NextResponse.json(healthData, { status: statusCode });
}
