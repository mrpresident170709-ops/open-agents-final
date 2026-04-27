import { tool } from "ai";
import { z } from "zod";
import {
  isProviderConfigured,
  getAvailableProviders,
  validateApiKeyShape,
  isFullyConfigured,
  getMissingEnvVars,
  getProxyConfig,
  getRequiredEnvVars,
  doctor,
  formatDoctorReport,
} from "../env";

const doctorInputSchema = z.object({
  verbose: z.boolean().optional().describe("Show detailed diagnostics"),
  checkModel: z.string().optional().describe("Specific model to check availability"),
});

export const doctorTool = tool({
  description: `Run environment diagnostics and health checks.

USE WHEN:
- Troubleshooting API key issues or authentication errors
- Checking which providers are properly configured
- Verifying the agent environment is correctly set up
- Diagnosing why a specific model or provider isn't working

This is your primary tool for debugging configuration issues — similar to 'claw doctor'.`,
  inputSchema: doctorInputSchema,
  execute: async ({ verbose: _verbose, checkModel }, context) => {
    try {
      const report = await doctor();
      const formatted = formatDoctorReport(report);

      if (checkModel) {
        const providerName = checkModel.split("/")[0] || "anthropic";
        const modelConfigured = isProviderConfigured(providerName);

        return {
          success: true,
          report: formatted,
          modelCheck: {
            model: checkModel,
            configured: modelConfigured,
            available: modelConfigured || isProviderConfigured("anthropic"),
          },
        };
      }

      return {
        success: true,
        report: formatted,
        status: report.status,
        hasIssues: report.issues.length > 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const checkProviderInputSchema = z.object({
  provider: z
    .enum([
      "anthropic",
      "openai",
      "together",
      "google",
      "xai",
      "groq",
      "mistral",
      "ollama",
      "openrouter",
      "exa",
      "firecrawl",
      "voyage",
    ])
    .describe("Provider to check"),
});

export const checkProviderTool = tool({
  description: `Check if a specific provider is configured and valid.

USE WHEN:
- Before making API calls, verify the provider is ready
- Debug authentication issues
- Check provider API key validity`,
  inputSchema: checkProviderInputSchema,
  execute: async ({ provider }) => {
    const configured = isProviderConfigured(provider);

    if (!configured) {
      return {
        configured: false,
        provider,
        status: "missing",
        error: `${provider} API key not configured`,
      };
    }

    return {
      configured: true,
      provider,
      status: "ok",
    };
  },
});

const listProvidersInputSchema = z.object({
  includeDisabled: z
    .boolean()
    .optional()
    .describe("Include disabled/unavailable providers"),
});

export const listProvidersTool = tool({
  description: `List all available providers and their status.

USE WHEN:
- Finding which providers you can use
- Checking what API keys are configured
- Planning which provider to use for a task`,
  inputSchema: listProvidersInputSchema,
  execute: async ({ includeDisabled }) => {
    const providers = getAvailableProviders();

    return {
      available: providers,
      count: providers.length,
    };
  },
});

const validateKeyInputSchema = z.object({
  provider: z
    .enum(["anthropic", "openai", "together", "xai", "groq", "exa"])
    .describe("Provider whose key to validate"),
  apiKey: z.string().describe("API key to validate"),
});

export const validateKeyTool = tool({
  description: `Validate an API key format for a specific provider.

USE WHEN:
- Checking if an API key is in the correct format
- Debugging authentication errors
- Before storing a new API key`,
  inputSchema: validateKeyInputSchema,
  execute: async ({ provider, apiKey }) => {
    const result = validateApiKeyShape(provider, apiKey);

    return {
      provider,
      valid: result.valid,
      error: result.error,
    };
  },
});

export const doctorTools = {
  doctor: doctorTool,
  checkProvider: checkProviderTool,
  listProviders: listProvidersTool,
  validateKey: validateKeyTool,
};