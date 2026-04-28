import {
  createGateway,
  defaultSettingsMiddleware,
  gateway as aiGateway,
  wrapLanguageModel,
  type GatewayModelId,
  type JSONValue,
  type LanguageModel,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  getAgentEnv,
  detectModelProvider,
  getProviderForModel,
  validateApiKeyShape,
  getProxyConfig,
  isDebugMode,
  isFullyConfigured,
  getMissingEnvVars,
  getAnthropicApiKey,
  getOpenAIApiKey,
  getMiniMaxApiKey,
} from "./env";

function supportsAdaptiveAnthropicThinking(modelId: string): boolean {
  return modelId.includes("4.6") || modelId.includes("4.7");
}

// Haiku-class models are optimised for speed and low cost — skip thinking.
function isHaikuModel(modelId: string): boolean {
  return modelId.toLowerCase().includes("haiku");
}

// Models with adaptive thinking support use effort control.
// Older models use the legacy extended thinking API with a budget.
// Haiku models skip thinking entirely to keep costs low.
function getAnthropicSettings(modelId: string): AnthropicLanguageModelOptions {
  if (isHaikuModel(modelId)) {
    return {};
  }

  if (supportsAdaptiveAnthropicThinking(modelId)) {
    return {
      effort: "medium",
      thinking: { type: "adaptive" },
    } satisfies AnthropicLanguageModelOptions;
  }

  return {
    thinking: { type: "enabled", budgetTokens: 8000 },
  };
}

function isJsonObject(value: unknown): value is Record<string, JSONValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toProviderOptionsRecord(
  options: Record<string, unknown>,
): Record<string, JSONValue> {
  return options as Record<string, JSONValue>;
}

function mergeRecords(
  base: Record<string, JSONValue>,
  override: Record<string, JSONValue>,
): Record<string, JSONValue> {
  const merged: Record<string, JSONValue> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existingValue = merged[key];

    if (isJsonObject(existingValue) && isJsonObject(value)) {
      merged[key] = mergeRecords(existingValue, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export type ProviderOptionsByProvider = Record<
  string,
  Record<string, JSONValue>
>;

export function mergeProviderOptions(
  defaults: ProviderOptionsByProvider,
  overrides?: ProviderOptionsByProvider,
): ProviderOptionsByProvider {
  if (!overrides || Object.keys(overrides).length === 0) {
    return defaults;
  }

  const merged: ProviderOptionsByProvider = { ...defaults };

  for (const [provider, providerOverrides] of Object.entries(overrides)) {
    const providerDefaults = merged[provider];

    if (!providerDefaults) {
      merged[provider] = providerOverrides;
      continue;
    }

    merged[provider] = mergeRecords(providerDefaults, providerOverrides);
  }

  return merged;
}

export interface GatewayConfig {
  baseURL: string;
  apiKey: string;
}

export interface GatewayOptions {
  config?: GatewayConfig;
  providerOptionsOverrides?: ProviderOptionsByProvider;
}

export type { GatewayModelId, LanguageModel, JSONValue };

export function shouldApplyOpenAIReasoningDefaults(modelId: string): boolean {
  return modelId.startsWith("openai/gpt-5");
}

function shouldApplyOpenAITextVerbosityDefaults(modelId: string): boolean {
  return modelId.startsWith("openai/gpt-5.4");
}

export function getProviderOptionsForModel(
  modelId: string,
  providerOptionsOverrides?: ProviderOptionsByProvider,
): ProviderOptionsByProvider {
  const defaultProviderOptions: ProviderOptionsByProvider = {};

  // Apply anthropic defaults
  if (modelId.startsWith("anthropic/")) {
    defaultProviderOptions.anthropic = toProviderOptionsRecord(
      getAnthropicSettings(modelId),
    );
  }

  // OpenAI model responses should never be persisted.
  if (modelId.startsWith("openai/")) {
    defaultProviderOptions.openai = toProviderOptionsRecord({
      store: false,
    } satisfies OpenAIResponsesProviderOptions);
  }

  // Apply OpenAI defaults for all GPT-5 variants to expose encrypted reasoning content.
  // This avoids Responses API failures when `store: false`, e.g.:
  // "Item with id 'rs_...' not found. Items are not persisted when `store` is set to false."
  if (shouldApplyOpenAIReasoningDefaults(modelId)) {
    defaultProviderOptions.openai = mergeRecords(
      defaultProviderOptions.openai ?? {},
      toProviderOptionsRecord({
        reasoningSummary: "detailed",
        include: ["reasoning.encrypted_content"],
      } satisfies OpenAIResponsesProviderOptions),
    );
  }

  if (shouldApplyOpenAITextVerbosityDefaults(modelId)) {
    defaultProviderOptions.openai = mergeRecords(
      defaultProviderOptions.openai ?? {},
      toProviderOptionsRecord({
        textVerbosity: "low",
      } satisfies OpenAIResponsesProviderOptions),
    );
  }

  const providerOptions = mergeProviderOptions(
    defaultProviderOptions,
    providerOptionsOverrides,
  );

  // Enforce OpenAI non-persistence even when custom provider overrides are present.
  if (modelId.startsWith("openai/")) {
    providerOptions.openai = mergeRecords(
      providerOptions.openai ?? {},
      toProviderOptionsRecord({
        store: false,
      } satisfies OpenAIResponsesProviderOptions),
    );
  }

  return providerOptions;
}

function resolveBaseModel(
  modelId: GatewayModelId,
  config?: GatewayConfig,
): LanguageModel {
  const id = modelId as string;

  const ANTHROPIC_VISION_MODELS = [
    "claude-sonnet-4-20250514",
    "claude-sonnet-4-20250509", 
    "claude-sonnet-4",
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-opus-4-5",
    "claude-opus-4",
    "claude-3-7-sonnet",
    "claude-3-5-sonnet-4",
    "claude-3-5-sonnet-3",
    "claude-3-5-sonnet-2",
    "claude-3-5-sonnet",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
  ];

  const anthropicModelId = id.startsWith("anthropic/") 
    ? id.slice("anthropic/".length).replace(/\./g, "-")
    : id.replace(/\./g, "-");

  const usesVision = ANTHROPIC_VISION_MODELS.some(m => 
    anthropicModelId.includes(m.replace(/\./g, "-"))
  );

  // Route Claude models through Anthropic SDK (supports vision natively)
  if (id.startsWith("anthropic/") || (!id.includes("/") && id.startsWith("claude-"))) {
    const modelName = id.startsWith("anthropic/") 
      ? id.slice("anthropic/".length).replace(/\./g, "-")
      : id.replace(/\./g, "-");
    const apiKey = getAgentEnv().ANTHROPIC_API_KEY;
    const anthropic = apiKey ? createAnthropic({ apiKey }) : createAnthropic();
    return anthropic(modelName);
  }

  // Route OpenAI models through OpenAI SDK (supports vision natively)
  if (id.startsWith("openai/")) {
    const openaiModelId = id.slice("openai/".length);
    const apiKey = getAgentEnv().OPENAI_API_KEY;
    const openai = apiKey ? createOpenAI({ apiKey }) : createOpenAI();
    return openai.responses(openaiModelId) as unknown as LanguageModel;
  }

  // Route opencode zen models
  if (id.startsWith("opencode/")) {
    const env = getAgentEnv();
    const opencodeModelId = id.slice("opencode/".length);
    const opencode = createOpenAI({
      apiKey: env.OPENCODE_API_KEY ?? env.OPENCODE_ZEN_API_KEY ?? "",
      baseURL: "https://opencode.ai/zen/v1",
      name: "opencode-zen",
    });
    return opencode.chat(opencodeModelId) as unknown as LanguageModel;
  }

  // Route MiniMax models via OpenAI SDK (MiniMax uses OpenAI-compatible API)
  if (id.startsWith("minimax/")) {
    const env = getAgentEnv();
    const miniMaxModelId = id.slice("minimax/".length);
    const miniMax = createOpenAI({
      apiKey: env.MINIMAX_API_KEY ?? "",
      baseURL: "https://api.minimax.io/v1",
      name: "minimax",
    });
    return miniMax.chat(miniMaxModelId) as unknown as LanguageModel;
  }

  // Fall back to Vercel AI Gateway for other providers
  const baseGateway = config
    ? createGateway({ baseURL: config.baseURL, apiKey: config.apiKey })
    : aiGateway;
  return baseGateway(modelId);
}

export function gateway(
  modelId: GatewayModelId,
  options: GatewayOptions = {},
): LanguageModel {
  const { config, providerOptionsOverrides } = options;

  let model = resolveBaseModel(modelId, config);

  const providerOptions = getProviderOptionsForModel(
    modelId,
    providerOptionsOverrides,
  );

  if (Object.keys(providerOptions).length > 0) {
    model = wrapLanguageModel({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      middleware: defaultSettingsMiddleware({
        settings: { providerOptions },
      }),
    }) as LanguageModel;
  }

  return model;
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
