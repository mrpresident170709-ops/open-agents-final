import { z } from "zod";

const agentEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_AUTH_TOKEN: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  TOGETHER_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  EXA_API_KEY: z.string().min(1).optional(),
  VOYAGE_API_KEY: z.string().min(1).optional(),
  OPENCODE_API_KEY: z.string().min(1).optional(),
  OPENCODE_ZEN_API_KEY: z.string().min(1).optional(),
  XAI_API_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  MISTRAL_API_KEY: z.string().min(1).optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  MINIMAX_API_KEY: z.string().min(1).optional(),
  PEXELS_API_KEY: z.string().min(1).optional(),

  TOGETHER_IMAGE_MODEL: z.string().optional(),
  CRITIC_MODEL: z.string().optional(),
  DEFAULT_MODEL: z.string().optional(),

  HTTP_PROXY: z.string().optional(),
  HTTPS_PROXY: z.string().optional(),
  NO_PROXY: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  CLAUDE_CONFIG_DIR: z.string().optional(),
  CODEX_HOME: z.string().optional(),

  AGENT_VERBOSE: z.boolean().optional(),
  AGENT_DEBUG: z.boolean().optional(),
  AGENT_TRACE: z.boolean().optional(),
});

type AgentEnv = z.infer<typeof agentEnvSchema>;

let _env: AgentEnv | null = null;
let _envSource: "process" | "config" | "secret" = "process";

function validateEnv(): AgentEnv {
  if (_env) return _env;

  const result = agentEnvSchema.safeParse(process.env);

  if (!result.success) {
    const warnings = result.error.issues
      .filter((i) => i.path.join(".") !== "NODE_ENV")
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`);

    if (warnings.length > 0) {
      console.warn("⚠️ Agent environment validation warnings:");
      console.warn(warnings.join("\n"));
    }
  }

  _env = result.data || ({} as AgentEnv);
  _envSource = "process";
  return _env;
}

export function getAgentEnv(): AgentEnv {
  return validateEnv();
}

export function getEnvSource(): string {
  return _envSource;
}

export function reloadEnv(): AgentEnv {
  _env = null;
  return validateEnv();
}

export const PROVIDER_ROUTES: Record<string, {
  provider: string;
  envVars: string[];
  baseUrlEnvVar?: string;
}> = {
  "anthropic/claude-": {
    provider: "anthropic",
    envVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"],
    baseUrlEnvVar: "ANTHROPIC_BASE_URL",
  },
  "claude-": {
    provider: "anthropic",
    envVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"],
    baseUrlEnvVar: "ANTHROPIC_BASE_URL",
  },
  "openai/": {
    provider: "openai",
    envVars: ["OPENAI_API_KEY"],
    baseUrlEnvVar: "OPENAI_BASE_URL",
  },
  "gpt-": {
    provider: "openai",
    envVars: ["OPENAI_API_KEY"],
    baseUrlEnvVar: "OPENAI_BASE_URL",
  },
  "o1-": {
    provider: "openai",
    envVars: ["OPENAI_API_KEY"],
    baseUrlEnvVar: "OPENAI_BASE_URL",
  },
  "google/": {
    provider: "google",
    envVars: ["GOOGLE_API_KEY"],
  },
  "gemini-": {
    provider: "google",
    envVars: ["GOOGLE_API_KEY"],
  },
  "xai/": {
    provider: "xai",
    envVars: ["XAI_API_KEY"],
  },
  "groq/": {
    provider: "groq",
    envVars: ["GROQ_API_KEY"],
  },
  "mistral/": {
    provider: "mistral",
    envVars: ["MISTRAL_API_KEY"],
  },
  "ollama/": {
    provider: "ollama",
    envVars: [],
    baseUrlEnvVar: "OLLAMA_BASE_URL",
  },
  "openrouter/": {
    provider: "openrouter",
    envVars: ["OPENROUTER_API_KEY"],
  },
  "together/": {
    provider: "together",
    envVars: ["TOGETHER_API_KEY"],
  },
};

export type ProviderName = keyof typeof PROVIDER_ROUTES;

export function getProviderForModel(modelId: string): { provider: string; envVars: string[]; baseUrlEnvVar?: string } | null {
  for (const [prefix, config] of Object.entries(PROVIDER_ROUTES)) {
    if (modelId.startsWith(prefix)) {
      return config;
    }
  }
  return null;
}

export function detectModelProvider(modelId: string): string {
  const lower = modelId.toLowerCase();
  if (lower.includes("claude") || lower.includes("anthropic")) return "anthropic";
  if (lower.includes("gpt") || lower.includes("openai") || lower.startsWith("o1")) return "openai";
  if (lower.includes("gemini") || lower.includes("google")) return "google";
  if (lower.includes("xai")) return "xai";
  if (lower.includes("groq")) return "groq";
  if (lower.includes("mistral")) return "mistral";
  if (lower.includes("ollama")) return "ollama";
  if (lower.includes("openrouter")) return "openrouter";
  if (lower.includes("together")) return "together";
  return "anthropic";
}

export interface EnvDiagnostics {
  timestamp: number;
  nodeEnv: string;
  configDir?: string;
  codexHome?: string;
  providers: {
    name: string;
    configured: boolean;
    keyPrefix: string;
    error?: string;
  }[];
  proxy: {
    http: string | null;
    https: string | null;
    noProxy: string | null;
  };
  issues: string[];
}

export async function runDiagnostics(): Promise<EnvDiagnostics> {
  const issues: EnvDiagnostics["providers"] = [];
  const env = getAgentEnv();

  const providerChecks = [
    { name: "Anthropic", key: env.ANTHROPIC_API_KEY, prefix: "sk-ant-" },
    { name: "OpenAI", key: env.OPENAI_API_KEY, prefix: "sk-" },
    { name: "Together", key: env.TOGETHER_API_KEY, prefix: "tk-" },
    { name: "xAI", key: env.XAI_API_KEY, prefix: "xai-" },
    { name: "Groq", key: env.GROQ_API_KEY, prefix: "gsk_" },
    { name: "Mistral", key: env.MISTRAL_API_KEY, prefix: "" },
    { name: "Exa", key: env.EXA_API_KEY, prefix: "" },
    { name: "Firecrawl", key: env.FIRECRAWL_API_KEY, prefix: "" },
    { name: "Voyage", key: env.VOYAGE_API_KEY, prefix: "" },
  ];

  for (const check of providerChecks) {
    if (check.key) {
      issues.push({
        name: check.name,
        configured: true,
        keyPrefix: check.key.slice(0, Math.min(10, check.key.length)) + (check.key.length > 10 ? "..." : ""),
      });
    } else {
      issues.push({
        name: check.name,
        configured: false,
        keyPrefix: "",
        error: `${check.name} API key not configured`,
      });
    }
  }

  const proxyIssues: string[] = [];
  if (env.HTTP_PROXY) proxyIssues.push(`HTTP_PROXY: ${env.HTTP_PROXY}`);
  if (env.HTTPS_PROXY) proxyIssues.push(`HTTPS_PROXY: ${env.HTTPS_PROXY}`);
  if (env.NO_PROXY) proxyIssues.push(`NO_PROXY: ${env.NO_PROXY}`);

  return {
    timestamp: Date.now(),
    nodeEnv: env.NODE_ENV || "development",
    configDir: env.CLAUDE_CONFIG_DIR,
    codexHome: env.CODEX_HOME,
    providers: issues as EnvDiagnostics["providers"],
    proxy: {
      http: env.HTTP_PROXY || null,
      https: env.HTTPS_PROXY || null,
      noProxy: env.NO_PROXY || null,
    },
    issues: proxyIssues,
  };
}

export function formatDiagnostics(diag: EnvDiagnostics): string {
  const lines: string[] = [
    "=== Agent Environment Diagnostics ===",
    `Timestamp: ${new Date(diag.timestamp).toISOString()}`,
    `Node Environment: ${diag.nodeEnv}`,
    "",
    "=== Providers ===",
  ];

  for (const p of diag.providers) {
    if (p.configured) {
      lines.push(`✅ ${p.name}: configured (${p.keyPrefix}...)`);
    } else {
      lines.push(`❌ ${p.name}: not configured`);
    }
  }

  if (diag.proxy.http || diag.proxy.https) {
    lines.push("", "=== Proxy ===");
    if (diag.proxy.http) lines.push(`  HTTP_PROXY: ${diag.proxy.http}`);
    if (diag.proxy.https) lines.push(`  HTTPS_PROXY: ${diag.proxy.https}`);
    if (diag.proxy.noProxy) lines.push(`  NO_PROXY: ${diag.proxy.noProxy}`);
  }

  return lines.join("\n");
}

export function isProviderConfigured(provider: string): boolean {
  const env = getAgentEnv();
  switch (provider.toLowerCase()) {
    case "anthropic":
      return !!env.ANTHROPIC_API_KEY;
    case "openai":
      return !!env.OPENAI_API_KEY;
    case "together":
      return !!env.TOGETHER_API_KEY;
    case "xai":
      return !!env.XAI_API_KEY;
    case "groq":
      return !!env.GROQ_API_KEY;
    case "mistral":
      return !!env.MISTRAL_API_KEY;
    case "exa":
      return !!env.EXA_API_KEY;
    case "firecrawl":
      return !!env.FIRECRAWL_API_KEY;
    case "voyage":
      return !!env.VOYAGE_API_KEY;
    case "ollama":
      return !!env.OLLAMA_BASE_URL;
    case "openrouter":
      return !!env.OPENROUTER_API_KEY;
    default:
      return false;
  }
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  const env = getAgentEnv();

  if (env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (env.OPENAI_API_KEY) providers.push("openai");
  if (env.TOGETHER_API_KEY) providers.push("together");
  if (env.XAI_API_KEY) providers.push("xai");
  if (env.GROQ_API_KEY) providers.push("groq");
  if (env.MISTRAL_API_KEY) providers.push("mistral");
  if (env.EXA_API_KEY) providers.push("exa");
  if (env.FIRECRAWL_API_KEY) providers.push("firecrawl");
  if (env.VOYAGE_API_KEY) providers.push("voyage");
  if (env.OLLAMA_BASE_URL) providers.push("ollama");
  if (env.OPENROUTER_API_KEY) providers.push("openrouter");

  return providers;
}

export function validateApiKeyShape(provider: string, apiKey: string): { valid: boolean; error?: string } {
  const shapes: Record<string, RegExp> = {
    anthropic: /^sk-ant-/,
    openai: /^sk-/,
    together: /^tk-/,
    xai: /^xai-/,
    groq: /^gsk_/,
    exa: /^exa-/,
  };

  const expected = shapes[provider.toLowerCase()];
  if (expected && !expected.test(apiKey)) {
    return {
      valid: false,
      error: `API key for ${provider} doesn't match expected format. Expected ${expected}, got ${apiKey.slice(0, 10)}...`,
    };
  }

  return { valid: true };
}

export function getRequiredEnvVars(): string[] {
  return ["ANTHROPIC_API_KEY"];
}

export function getMissingEnvVars(): string[] {
  const required = getRequiredEnvVars();
  const env = getAgentEnv();
  return required.filter((v) => !env[v as keyof AgentEnv]);
}

export function isFullyConfigured(): boolean {
  return getMissingEnvVars().length === 0;
}

export function getProxyConfig(): { http?: string; https?: string; no_proxy?: string } {
  const env = getAgentEnv();
  const config: { http?: string; https?: string; no_proxy?: string } = {};

  if (env.HTTP_PROXY) config.http = env.HTTP_PROXY;
  if (env.HTTPS_PROXY) config.https = env.HTTPS_PROXY;
  if (env.NO_PROXY) config.no_proxy = env.NO_PROXY;

  return config;
}

export function getConfiguredModel(): string {
  return getAgentEnv().DEFAULT_MODEL || "anthropic/claude-sonnet-4-20250514";
}

export function getTogetherImageModel(): string {
  return getAgentEnv().TOGETHER_IMAGE_MODEL || "google/flash-image-3.1";
}

export function getCriticModel(): string {
  return getAgentEnv().CRITIC_MODEL || "anthropic/claude-sonnet-4-20250514";
}

export function isDebugMode(): boolean {
  return getAgentEnv().AGENT_DEBUG === true || getAgentEnv().AGENT_VERBOSE === true;
}

export function isTraceMode(): boolean {
  return getAgentEnv().AGENT_TRACE === true;
}

export function getAnthropicApiKey(): string {
  const key = getAgentEnv().ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. " +
        "Add it to your environment variables or set it as a user secret in /settings/secrets.",
    );
  }
  return key;
}

export function getOpenAIApiKey(): string {
  const key = getAgentEnv().OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured. " +
        "Add it to your environment variables or set it as a user secret in /settings/secrets.",
    );
  }
  return key;
}

export function getTogetherApiKey(): string {
  const key = getAgentEnv().TOGETHER_API_KEY;
  if (!key) {
    throw new Error(
      "TOGETHER_API_KEY is not configured. " +
        "Add it to your environment variables or set it as a user secret in /settings/secrets.",
    );
  }
  return key;
}

export function getExaApiKey(): string {
  const key = getAgentEnv().EXA_API_KEY;
  if (!key) {
    throw new Error(
      "EXA_API_KEY is not configured. " +
        "Add it to your environment variables or set it as a user secret in /settings/secrets.",
    );
  }
  return key;
}

export function getMiniMaxApiKey(): string | undefined {
  return getAgentEnv().MINIMAX_API_KEY;
}

export function getPexelsApiKey(): string | undefined {
  return getAgentEnv().PEXELS_API_KEY;
}

export function getFirecrawlApiKey(): string {
  const key = getAgentEnv().FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error(
      "FIRECRAWL_API_KEY is not configured. " +
        "Add it to your environment variables or set it as a user secret in /settings/secrets.",
    );
  }
  return key;
}

export function isAnthropicConfigured(): boolean {
  return !!getAgentEnv().ANTHROPIC_API_KEY;
}

export function isOpenAIConfigured(): boolean {
  return !!getAgentEnv().OPENAI_API_KEY;
}

export function isTogetherConfigured(): boolean {
  return !!getAgentEnv().TOGETHER_API_KEY;
}

export function isFirecrawlConfigured(): boolean {
  return !!getAgentEnv().FIRECRAWL_API_KEY;
}

export function isExaConfigured(): boolean {
  return !!getAgentEnv().EXA_API_KEY;
}

export async function doctor(): Promise<{
  status: "healthy" | "degraded" | "broken";
  issues: string[];
  providers: { name: string; status: "ok" | "missing" | "invalid_key"; error?: string }[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const providerStatuses: { name: string; status: "ok" | "missing" | "invalid_key"; error?: string }[] = [];
  const env = getAgentEnv();

  const checks = [
    { id: "anthropic", name: "Anthropic", key: env.ANTHROPIC_API_KEY, expectedPrefix: "sk-ant-" },
    { id: "openai", name: "OpenAI", key: env.OPENAI_API_KEY, expectedPrefix: "sk-" },
    { id: "together", name: "Together", key: env.TOGETHER_API_KEY, expectedPrefix: "tk-" },
    { id: "xai", name: "xAI", key: env.XAI_API_KEY, expectedPrefix: "xai-" },
    { id: "groq", name: "Groq", key: env.GROQ_API_KEY, expectedPrefix: "gsk_" },
  ];

  for (const check of checks) {
    if (!check.key) {
      providerStatuses.push({ name: check.name, status: "missing" });
      issues.push(`${check.name} API key not configured`);
      continue;
    }

    if (check.expectedPrefix && !check.key.startsWith(check.expectedPrefix)) {
      providerStatuses.push({
        name: check.name,
        status: "invalid_key",
        error: `key should start with ${check.expectedPrefix}`,
      });
      issues.push(`${check.name} API key may be invalid (expected prefix ${check.expectedPrefix})`);
      suggestions.push(`Move ${check.name} key to correct env var if using different provider`);
    } else {
      providerStatuses.push({ name: check.name, status: "ok" });
    }
  }

  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    issues.push("No LLM provider configured");
    suggestions.push("Set ANTHROPIC_API_KEY or OPENAI_API_KEY to use the agent");
  }

  if (env.HTTP_PROXY || env.HTTPS_PROXY) {
    suggestions.push("Proxy configured - ensure it allows API endpoints");
  }

  if (isDebugMode()) {
    suggestions.push("Debug mode enabled - verbose logging active");
  }

  let status: "healthy" | "degraded" | "broken" = "healthy";
  if (providerStatuses.some((p) => p.status === "missing")) {
    status = issues.length > 1 ? "broken" : "degraded";
  }

  return { status, issues: issues.slice(0, 5), providers: providerStatuses, suggestions: suggestions.slice(0, 5) };
}

export function formatDoctorReport(report: Awaited<ReturnType<typeof doctor>>): string {
  const lines = ["=== Agent Doctor Report ===", ""];

  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push("");

  lines.push("=== Provider Status ===");
  for (const p of report.providers) {
    if (p.status === "ok") {
      lines.push(`✅ ${p.name}: OK`);
    } else if (p.status === "missing") {
      lines.push(`❌ ${p.name}: Not configured`);
    } else {
      lines.push(`⚠️  ${p.name}: ${p.error}`);
    }
  }

  if (report.issues.length > 0) {
    lines.push("", "=== Issues ===");
    for (const issue of report.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  if (report.suggestions.length > 0) {
    lines.push("", "=== Suggestions ===");
    for (const suggestion of report.suggestions) {
      lines.push(`  - ${suggestion}`);
    }
  }

  return lines.join("\n");
}