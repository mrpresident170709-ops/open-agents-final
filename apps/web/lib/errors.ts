import { z } from "zod";

export class ConfigurationError extends Error {
  constructor(
    public readonly service: string,
    public readonly missingVars: string[],
    public readonly help?: string,
  ) {
    const message = `Missing configuration for ${service}: ${missingVars.join(", ")}`;
    super(message);
    this.name = "ConfigurationError";
  }
}

export function formatConfigError(error: ConfigurationError): string {
  const lines = [
    `❌ ${error.name}: ${error.message}`,
    "",
    "Missing variables:",
    ...error.missingVars.map((v) => `  - ${v}`),
  ];
  if (error.help) {
    lines.push("", `ℹ️  ${error.help}`);
  }
  return lines.join("\n");
}

const envSchema = z.object({
  // Critical Infrastructure (Required for app to function)
  POSTGRES_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  JWE_SECRET: z.string().min(32, "JWE_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (key) => /^[0-9a-fA-F]{64}$/.test(key) || /^[A-Za-z0-9+/=]{44}$/.test(key),
      "ENCRYPTION_KEY must be 64 hex chars or 44 base64 chars (32 bytes)",
    ),

  // Vercel OAuth (Required for Vercel sign-in)
  NEXT_PUBLIC_VERCEL_APP_CLIENT_ID: z.string().min(1).optional(),
  VERCEL_APP_CLIENT_SECRET: z.string().min(1).optional(),

  // Vercel Sandbox (Required for sandbox features)
  VERCEL_TOKEN: z.string().min(1).optional(),
  VERCEL_ACCESS_TOKEN: z.string().min(1).optional(),
  VERCEL_TEAM_ID: z.string().min(1).optional(),
  VERCEL_PROJECT_ID: z.string().min(1).optional(),
  VERCEL_SANDBOX_TIMEOUT_MS: z
    .string()
    .regex(/^\d+$/, "Must be a number in milliseconds")
    .optional(),
  VERCEL_SANDBOX_BASE_SNAPSHOT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

  // GitHub App (Required for GitHub integration)
  NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_APP_ID: z.coerce.number().int().positive().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_GITHUB_APP_SLUG: z.string().min(1).optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Redis (Optional - for session/cache)
  REDIS_URL: z.string().url().optional(),
  KV_URL: z.string().url().optional(),

  // AI API Keys (Optional - users can also set these per-user)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  TOGETHER_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  EXA_API_KEY: z.string().min(1).optional(),
  OPENCODE_API_KEY: z.string().min(1).optional(),
  OPENCODE_ZEN_API_KEY: z.string().min(1).optional(),

  // Feature flags
  SINGLE_USER_MODE: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),

  // Replit-specific (Optional)
  REPL_ID: z.string().optional(),
  REPLIT_DEV_DOMAIN: z.string().optional(),
  REPLIT_DOMAINS: z.string().optional(),

  // Local sandbox
  LOCAL_SANDBOX_ROOT: z.string().optional(),

  // Voice/Transcription
  ELEVENLABS_API_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;
let _validationError: z.ZodError | null = null;

function validateEnv(): { data: Env | null; error: z.ZodError | null } {
  if (_env) return { data: _env, error: null };

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    _validationError = result.error;
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Environment validation failed:\n${result.error.issues
          .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
          .join("\n")}`,
      );
    }
    console.warn(
      "⚠️ Environment validation warnings:\n",
      result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n"),
    );
    // Return partial data with defaults
    _env = result.data || ({} as Env);
    return { data: _env, error: result.error };
  }

  _env = result.data;
  return { data: _env, error: null };
}

export function getEnv(): Env {
  const { data } = validateEnv();
  if (!data) {
    throw new Error("Environment not initialized");
  }
  return data;
}

export const env = new Proxy({} as Env, {
  get(_, prop: string | symbol) {
    const e = getEnv();
    return e[prop as keyof Env];
  },
});

// Feature configuration checkers
export function isVercelOAuthConfigured(): boolean {
  const e = getEnv();
  return !!(e.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID && e.VERCEL_APP_CLIENT_SECRET);
}

export function isGitHubAppConfigured(): boolean {
  const e = getEnv();
  return !!(e.GITHUB_APP_ID && e.GITHUB_APP_PRIVATE_KEY);
}

export function isVercelSandboxConfigured(): boolean {
  const e = getEnv();
  return !!(e.VERCEL_TOKEN && e.VERCEL_TEAM_ID && e.VERCEL_PROJECT_ID);
}

export function isDatabaseConfigured(): boolean {
  const e = getEnv();
  return !!(e.POSTGRES_URL || e.DATABASE_URL);
}

export function isEncryptionConfigured(): boolean {
  const e = getEnv();
  return !!(e.JWE_SECRET && e.ENCRYPTION_KEY);
}

export function getDatabaseUrl(): string {
  const e = getEnv();
  const url = e.POSTGRES_URL || e.DATABASE_URL;
  if (!url) {
    throw new ConfigurationError("Database", ["POSTGRES_URL or DATABASE_URL"], "Set POSTGRES_URL in your environment variables");
  }
  return url;
}

export function getJweSecret(): string {
  const e = getEnv();
  if (!e.JWE_SECRET) {
    throw new ConfigurationError("JWE Encryption", ["JWE_SECRET"], "Set JWE_SECRET (min 32 chars) in your environment variables");
  }
  return e.JWE_SECRET;
}

export function getEncryptionKey(): string {
  const e = getEnv();
  if (!e.ENCRYPTION_KEY) {
    throw new ConfigurationError("User Secrets Encryption", ["ENCRYPTION_KEY"], "Set ENCRYPTION_KEY (64 hex or 44 base64 chars) in your environment variables");
  }
  return e.ENCRYPTION_KEY;
}

// Startup validation function for instrumentation
export function validateEnvOrDie(): void {
  const { data, error } = validateEnv();

  if (error) {
    console.error("❌ Environment validation failed:");
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });

    const criticalMissing: string[] = [];
    if (!isDatabaseConfigured()) criticalMissing.push("POSTGRES_URL or DATABASE_URL");
    if (!isEncryptionConfigured()) {
      if (!data?.JWE_SECRET) criticalMissing.push("JWE_SECRET");
      if (!data?.ENCRYPTION_KEY) criticalMissing.push("ENCRYPTION_KEY");
    }

    if (criticalMissing.length > 0 && process.env.NODE_ENV === "production") {
      console.error(`\n💀 Critical variables missing: ${criticalMissing.join(", ")}`);
      console.error("Application cannot start. Please check your environment variables.");
      process.exit(1);
    }
  }
}

// Get validation issues for health check
export function getEnvValidationIssues(): Array<{ path: string; message: string }> {
  const { error } = validateEnv();
  if (!error) return [];
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}
