import { z } from "zod";

const sandboxEnvSchema = z.object({
  // Vercel Sandbox credentials
  VERCEL_TOKEN: z.string().min(1).optional(),
  VERCEL_ACCESS_TOKEN: z.string().min(1).optional(),
  // Vercel automatically injects VERCEL_OIDC_TOKEN when "Compute Credentials"
  // is enabled in the project's Vercel settings. The @vercel/sandbox SDK
  // recognises it as a JWT and auto-refreshes it, so no manual token setup
  // is needed for deployed apps.
  VERCEL_OIDC_TOKEN: z.string().min(1).optional(),
  VERCEL_TEAM_ID: z.string().min(1).optional(),
  VERCEL_PROJECT_ID: z.string().min(1).optional(),

  // Daytona Sandbox credentials
  DAYTONA_API_KEY: z.string().min(1).optional(),
  DAYTONA_API_URL: z.string().url().optional(),
  DAYTONA_TARGET: z.string().optional(),

  // Local sandbox
  REPL_ID: z.string().optional(),
  REPLIT_DEV_DOMAIN: z.string().optional(),
  LOCAL_SANDBOX_ROOT: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

type SandboxEnv = z.infer<typeof sandboxEnvSchema>;

let _env: SandboxEnv | null = null;

function validateEnv(): SandboxEnv {
  if (_env) return _env;

  const result = sandboxEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.warn(
      "⚠️ Sandbox environment validation warnings:",
      result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n"),
    );
  }

  _env = result.data || ({} as SandboxEnv);
  return _env;
}

export function getSandboxEnv(): SandboxEnv {
  return validateEnv();
}

export function getVercelCredentials(): {
  token: string;
  teamId: string;
  projectId: string;
} | null {
  const env = getSandboxEnv();
  // Priority: explicit static token → Vercel OIDC JWT (auto-refreshed by SDK)
  const token =
    env.VERCEL_TOKEN || env.VERCEL_ACCESS_TOKEN || env.VERCEL_OIDC_TOKEN;
  const teamId = env.VERCEL_TEAM_ID;
  const projectId = env.VERCEL_PROJECT_ID;

  if (token && teamId && projectId) {
    return { token, teamId, projectId };
  }
  return null;
}

export function getDaytonaCredentials(): { apiKey: string } | null {
  const env = getSandboxEnv();
  const apiKey = env.DAYTONA_API_KEY || process.env.DAYTONA_API_KEY;
  if (apiKey) {
    return { apiKey };
  }
  return null;
}

export function isVercelSandboxConfigured(): boolean {
  return getVercelCredentials() !== null;
}

export function isDaytonaConfigured(): boolean {
  return getDaytonaCredentials() !== null;
}

export function isLocalSandbox(): boolean {
  const env = getSandboxEnv();
  return !!env.REPL_ID;
}
