import { tool } from "ai";
import { z } from "zod";

const checkSecretsInputSchema = z.object({
  names: z
    .array(z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Env var names must be UPPER_SNAKE_CASE"))
    .min(1)
    .describe("The env var names this feature requires (e.g. ['OPENAI_API_KEY', 'STRIPE_KEY'])"),
});

export type CheckSecretsInput = z.infer<typeof checkSecretsInputSchema>;

const checkSecretsOutputSchema = z.object({
  present: z.array(z.string()).describe("Secret names that are configured and will be injected"),
  missing: z.array(z.string()).describe("Secret names that are not yet configured by the user"),
  allPresent: z.boolean().describe("True when every required secret is already configured"),
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
  description: `Check which environment variable secrets are available before implementing a feature that needs API keys.

WHEN TO USE — call this tool when you are about to implement functionality that requires external API keys or credentials. Examples:
- Before adding AI/LLM calls: check for OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
- Before payment integration: check for STRIPE_SECRET_KEY
- Before email sending: check for RESEND_API_KEY, SENDGRID_API_KEY
- Before database connection: check for DATABASE_URL
- Before OAuth: check for GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_SECRET

WORKFLOW:
1. Call check_secrets with the list of needed names
2. If allPresent → proceed with implementation
3. If there are missing secrets → call request_secrets to prompt the user before writing code that depends on them`,
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

    return {
      present,
      missing,
      allPresent: missing.length === 0,
    };
  },
  toModelOutput: ({ output }) => {
    if (!output) {
      return { type: "text", value: "Could not check secrets." };
    }

    const lines: string[] = [];
    if (output.present.length > 0) {
      lines.push(`Present: ${output.present.join(", ")}`);
    }
    if (output.missing.length > 0) {
      lines.push(`Missing: ${output.missing.join(", ")}`);
    }
    lines.push(output.allPresent ? "All required secrets are configured." : "Some secrets are missing — call request_secrets to prompt the user.");

    return { type: "text", value: lines.join("\n") };
  },
});
