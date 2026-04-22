import { tool } from "ai";
import { z } from "zod";
import { auditRequestedNames, getCanonicalEntry } from "./key-registry";

const checkSecretsInputSchema = z.object({
  names: z
    .array(z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Env var names must be UPPER_SNAKE_CASE"))
    .min(1)
    .describe(
      "The canonical env var names this feature requires. " +
        "Always use the exact name from the canonical key registry " +
        "(e.g. OPENAI_API_KEY, STRIPE_SECRET_KEY, DATABASE_URL). " +
        "Never invent a name for a well-known service.",
    ),
});

export type CheckSecretsInput = z.infer<typeof checkSecretsInputSchema>;

const checkSecretsOutputSchema = z.object({
  present: z.array(z.string()).describe("Secret names that are configured and will be injected"),
  missing: z.array(z.string()).describe("Secret names that are not yet configured by the user"),
  allPresent: z.boolean().describe("True when every required secret is already configured"),
  registryInfo: z
    .array(
      z.object({
        name: z.string(),
        service: z.string(),
        docUrl: z.string(),
        isPublic: z.boolean().optional(),
        format: z.string().optional(),
      }),
    )
    .describe(
      "Registry metadata for the requested names — use docUrl in request_secrets, " +
        "format in validate_env, isPublic to know if the key is safe for the client bundle.",
    ),
  nonCanonical: z
    .array(
      z.object({
        requested: z.string(),
        suggestions: z.array(z.string()).describe("Canonical names you should use instead"),
      }),
    )
    .describe(
      "Names that are NOT in the canonical key registry. " +
        "If suggestions is non-empty, you MUST rename to the suggested canonical name. " +
        "Only leave a name non-canonical if it is genuinely project-specific (no well-known service maps to it).",
    ),
});

export type CheckSecretsOutput = z.infer<typeof checkSecretsOutputSchema>;

function getAvailableSecrets(experimental_context: unknown): string[] {
  if (
    typeof experimental_context === "object" &&
    experimental_context !== null &&
    "availableSecrets" in experimental_context &&
    Array.isArray((experimental_context as { availableSecrets: unknown }).availableSecrets)
  ) {
    return (experimental_context as { availableSecrets: string[] }).availableSecrets;
  }
  return [];
}

export const checkSecretsTool = tool({
  description: `Check which environment variable secrets are available AND validate they use canonical names.

WHEN TO USE — call this before implementing any feature that needs API keys or credentials.

CANONICAL NAMES RULE (CRITICAL):
Always use the canonical env var name from the key registry. Never invent names for well-known services.
Wrong: MY_OPENAI_KEY, OPEN_AI_KEY, AI_SECRET_KEY → Right: OPENAI_API_KEY
Wrong: PAYMENT_KEY, STRIPE_KEY, STRIPE_API → Right: STRIPE_SECRET_KEY  
Wrong: DB_URL, PG_URL, POSTGRES_SECRET → Right: DATABASE_URL

The tool returns registryInfo with description, docUrl, and format for each known key —
use this to fill in request_secrets items and validate_env requirements automatically.

WORKFLOW:
1. Call check_secrets with the canonical names you need
2. Check nonCanonical — if suggestions exist, use those names instead (re-call if needed)
3. If allPresent → proceed with implementation
4. If missing → call request_secrets using registryInfo.docUrl for each missing key`,

  inputSchema: checkSecretsInputSchema,
  outputSchema: checkSecretsOutputSchema,

  execute: async ({ names }, { experimental_context }) => {
    const available = new Set(getAvailableSecrets(experimental_context));
    const present: string[] = [];
    const missing: string[] = [];

    for (const name of names) {
      if (available.has(name)) {
        present.push(name);
      } else {
        missing.push(name);
      }
    }

    // Registry info for all requested names (enriches downstream tool calls)
    const registryInfo = names.flatMap((name) => {
      const entry = getCanonicalEntry(name);
      if (!entry) return [];
      return [
        {
          name: entry.name,
          service: entry.service,
          docUrl: entry.docUrl,
          ...(entry.isPublic !== undefined ? { isPublic: entry.isPublic } : {}),
          ...(entry.format !== undefined ? { format: entry.format } : {}),
        },
      ];
    });

    // Audit for non-canonical names and suggest alternatives
    const audit = auditRequestedNames(names);
    const nonCanonical = audit.suggestions.map((s) => ({
      requested: s.requested,
      suggestions: s.alternatives.map((a) => a.name),
    }));

    return {
      present,
      missing,
      allPresent: missing.length === 0,
      registryInfo,
      nonCanonical,
    };
  },

  toModelOutput: ({ output }) => {
    if (!output) {
      return { type: "text", value: "Could not check secrets." };
    }

    const lines: string[] = [];

    if (output.nonCanonical.length > 0) {
      lines.push("⚠ Non-canonical names detected — rename before proceeding:");
      for (const nc of output.nonCanonical) {
        lines.push(
          `  "${nc.requested}" → use: ${nc.suggestions.join(" or ")}`,
        );
      }
    }

    if (output.present.length > 0) {
      lines.push(`Present: ${output.present.join(", ")}`);
    }
    if (output.missing.length > 0) {
      lines.push(`Missing: ${output.missing.join(", ")}`);
    }

    lines.push(
      output.allPresent
        ? "All required secrets are configured."
        : "Some secrets are missing — call request_secrets to prompt the user.",
    );

    if (output.registryInfo.length > 0) {
      lines.push(
        "\nRegistry metadata (use in request_secrets + validate_env):",
      );
      for (const info of output.registryInfo) {
        const parts = [`  ${info.name}: ${info.service}`];
        if (info.docUrl) parts.push(`  URL: ${info.docUrl}`);
        if (info.format) parts.push(`  format: ${info.format}`);
        if (info.isPublic) parts.push(`  client-safe: yes`);
        lines.push(parts.join(" | "));
      }
    }

    return { type: "text", value: lines.join("\n") };
  },
});
