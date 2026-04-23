import { z } from "zod";

const agentEnvSchema = z.object({
  // AI API Keys (Optional - can also be set per-user via web app secrets)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  TOGETHER_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  EXA_API_KEY: z.string().min(1).optional(),
  OPENCODE_API_KEY: z.string().min(1).optional(),
  OPENCODE_ZEN_API_KEY: z.string().min(1).optional(),

  // Image generation
  TOGETHER_IMAGE_MODEL: z.string().optional(),
  CRITIC_MODEL: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

type AgentEnv = z.infer<typeof agentEnvSchema>;

let _env: AgentEnv | null = null;

function validateEnv(): AgentEnv {
  if (_env) return _env;

  const result = agentEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.warn(
      "⚠️ Agent environment validation warnings:",
      result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n"),
    );
    // Return partial data
    _env = result.data || ({} as AgentEnv);
    return _env;
  }

  _env = result.data;
  return _env;
}

export function getAgentEnv(): AgentEnv {
  return validateEnv();
}

// Helper functions for checking if specific services are configured
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

// Get API keys with proper error handling
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

export function getTogetherImageModel(): string {
  return getAgentEnv().TOGETHER_IMAGE_MODEL || "google/flash-image-3.1";
}
