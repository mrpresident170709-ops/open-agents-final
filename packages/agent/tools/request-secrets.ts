import { tool, type UIToolInvocation } from "ai";
import { z } from "zod";

const secretRequestItemSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/)
    .describe("The env var name (e.g. OPENAI_API_KEY)"),
  description: z
    .string()
    .describe("One sentence: why this secret is needed and where to get it"),
  url: z
    .string()
    .url()
    .optional()
    .describe("Optional URL to the provider's API key page (e.g. https://platform.openai.com/api-keys)"),
});

export const requestSecretsInputSchema = z.object({
  secrets: z
    .array(secretRequestItemSchema)
    .min(1)
    .describe("The secrets the user needs to add before implementation can proceed"),
  reason: z
    .string()
    .describe(
      "One sentence explaining what feature is being built that needs these secrets",
    ),
});

export type RequestSecretsInput = z.infer<typeof requestSecretsInputSchema>;
export type RequestSecretsItem = z.infer<typeof secretRequestItemSchema>;

const requestSecretsOutputSchema = z.union([
  z.object({ confirmed: z.literal(true) }),
  z.object({ skipped: z.literal(true) }),
]);

export type RequestSecretsOutput = z.infer<typeof requestSecretsOutputSchema>;

export const requestSecretsTool = tool({
  description: `Ask the user to provide missing API keys or secrets before implementing a feature that depends on them.

WHEN TO USE — call this immediately after check_secrets returns missing secrets.

RULES:
- Only call this for secrets that are genuinely required (not nice-to-have)
- Provide a clear description of why each secret is needed
- Include the official URL where the user can get the key when possible
- Do NOT write code that uses the missing secret before the user confirms
- After the user confirms ("confirmed"), proceed with implementation — the secrets will be injected on the next sandbox turn
- If the user skips, you may still implement the feature but add a clear TODO comment and guard: if (!process.env.SECRET_NAME) throw new Error("SECRET_NAME is not configured")`,
  inputSchema: requestSecretsInputSchema,
  outputSchema: requestSecretsOutputSchema,
  // NO execute — this is a client-side tool that renders an interactive UI card
  toModelOutput: ({ output }) => {
    if (!output) {
      return { type: "text", value: "User did not respond to secret request." };
    }
    if ("confirmed" in output && output.confirmed) {
      return {
        type: "text",
        value:
          "User confirmed they have added the requested secrets. The secrets will be injected into the sandbox on this turn if the code already references them, or on the next message if you write the references now. Proceed with implementation.",
      };
    }
    if ("skipped" in output && output.skipped) {
      return {
        type: "text",
        value:
          "User chose to skip adding secrets. Implement the feature anyway but add a clear runtime guard at the top of the relevant file: `if (!process.env.SECRET_NAME) throw new Error('SECRET_NAME is required — add it in Settings → Secrets');`. Add a TODO comment explaining what the user needs to configure.",
      };
    }
    return { type: "text", value: "User dismissed the secret request." };
  },
});

export type RequestSecretsToolUIPart = UIToolInvocation<typeof requestSecretsTool>;
