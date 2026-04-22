import { tool } from "ai";
import { z } from "zod";
import { getSandbox } from "./utils";

// ─── Known format validators ──────────────────────────────────────────────────
// Each entry maps an env var name pattern to a JS predicate (safe to embed in
// a bash-executed node script — no value is ever printed, only pass/fail).
//
// The `pattern` field is a JS boolean expression using the variable `v`.
// The `hint` field is shown to the agent when the format check fails.

interface FormatValidator {
  pattern: string; // JS expression: v => <this part>
  hint: string;
}

const KNOWN_VALIDATORS: Record<string, FormatValidator> = {
  OPENAI_API_KEY: {
    pattern: "v.startsWith('sk-')",
    hint: 'Must start with "sk-" (e.g. sk-proj-...)',
  },
  ANTHROPIC_API_KEY: {
    pattern: "v.startsWith('sk-ant-')",
    hint: 'Must start with "sk-ant-"',
  },
  GEMINI_API_KEY: {
    pattern: "v.startsWith('AI')",
    hint: 'Google AI keys typically start with "AI"',
  },
  STRIPE_SECRET_KEY: {
    pattern: "/^sk_(live|test)_/.test(v)",
    hint: 'Must start with "sk_live_" or "sk_test_"',
  },
  STRIPE_PUBLISHABLE_KEY: {
    pattern: "/^pk_(live|test)_/.test(v)",
    hint: 'Must start with "pk_live_" or "pk_test_"',
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    pattern: "/^pk_(live|test)_/.test(v)",
    hint: 'Must start with "pk_live_" or "pk_test_"',
  },
  RESEND_API_KEY: {
    pattern: "v.startsWith('re_')",
    hint: 'Must start with "re_"',
  },
  DATABASE_URL: {
    pattern: "/^postgres(ql)?:\\/\\//.test(v) || /^mysql:\\/\\//.test(v) || /^mongodb(\\+srv)?:\\/\\//.test(v)",
    hint: 'Must be a valid connection string (e.g. postgresql://user:pass@host/db)',
  },
  POSTGRES_URL: {
    pattern: "/^postgres(ql)?:\\/\\//.test(v)",
    hint: 'Must start with "postgres://" or "postgresql://"',
  },
  SUPABASE_URL: {
    pattern: "/^https:\\/\\/.+\\.supabase\\.co/.test(v)",
    hint: 'Must be a Supabase project URL (https://<project>.supabase.co)',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    pattern: "v.startsWith('eyJ') && v.length > 100",
    hint: 'Must be a valid Supabase JWT service role key (starts with "eyJ")',
  },
  SUPABASE_ANON_KEY: {
    pattern: "v.startsWith('eyJ') && v.length > 100",
    hint: 'Must be a valid Supabase JWT anon key (starts with "eyJ")',
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    pattern: "v.startsWith('eyJ') && v.length > 100",
    hint: 'Must be a valid Supabase JWT anon key (starts with "eyJ")',
  },
  TWILIO_ACCOUNT_SID: {
    pattern: "v.startsWith('AC') && v.length === 34",
    hint: 'Must start with "AC" and be 34 characters long',
  },
  TWILIO_AUTH_TOKEN: {
    pattern: "v.length === 32",
    hint: 'Must be 32 characters long',
  },
  CLOUDINARY_API_SECRET: {
    pattern: "v.length >= 20",
    hint: 'Must be at least 20 characters',
  },
  MAPBOX_ACCESS_TOKEN: {
    pattern: "v.startsWith('pk.') || v.startsWith('sk.')",
    hint: 'Must start with "pk." (public) or "sk." (secret)',
  },
  PINECONE_API_KEY: {
    pattern: "v.length >= 30",
    hint: 'Must be at least 30 characters',
  },
  GITHUB_TOKEN: {
    pattern: "v.startsWith('ghp_') || v.startsWith('github_pat_') || v.startsWith('gho_')",
    hint: 'Must start with "ghp_", "github_pat_", or "gho_"',
  },
  SENDGRID_API_KEY: {
    pattern: "v.startsWith('SG.')",
    hint: 'Must start with "SG."',
  },
  FIREBASE_SERVICE_ACCOUNT_KEY: {
    pattern: "v.startsWith('{') || v.startsWith('eyJ')",
    hint: 'Must be a JSON service account object or base64-encoded JSON',
  },
};

// Format types the agent can specify explicitly
const FORMAT_PRESETS: Record<string, FormatValidator> = {
  url: {
    pattern: "/^https?:\\/\\/.+/.test(v)",
    hint: 'Must be a valid URL starting with http:// or https://',
  },
  "https-url": {
    pattern: "v.startsWith('https://')",
    hint: 'Must be an HTTPS URL',
  },
  "jwt-secret": {
    pattern: "v.length >= 32",
    hint: 'JWT secret must be at least 32 characters for security',
  },
  uuid: {
    pattern: "/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)",
    hint: 'Must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
  },
  "non-empty": {
    pattern: "v.trim().length > 0",
    hint: 'Must not be empty or whitespace-only',
  },
  "base64": {
    pattern: "/^[A-Za-z0-9+/]+=*$/.test(v)",
    hint: 'Must be valid base64-encoded data',
  },
};

const VALIDATION_TIMEOUT_MS = 10_000;

// ─── Schema ───────────────────────────────────────────────────────────────────

const requirementSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/)
    .describe("Env var name (UPPER_SNAKE_CASE)"),
  required: z
    .boolean()
    .default(true)
    .describe("Whether this var must be present for the code to run correctly"),
  format: z
    .string()
    .optional()
    .describe(
      "Format preset or 'auto' to use built-in validator for this var name. " +
        "Presets: url, https-url, jwt-secret, uuid, non-empty, base64. " +
        "Pass 'auto' to use the built-in validator for known keys (OPENAI_API_KEY, STRIPE_*, etc.). " +
        "Omit to skip format validation.",
    ),
  minLength: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Minimum character length for the value"),
  description: z
    .string()
    .optional()
    .describe("Brief human-readable description of what this var is used for"),
});

export type EnvRequirement = z.infer<typeof requirementSchema>;

const validateEnvInputSchema = z.object({
  requirements: z
    .array(requirementSchema)
    .min(1)
    .describe("The env vars to validate before running the code"),
  context: z
    .string()
    .optional()
    .describe(
      "Brief description of what is about to be executed (e.g. 'npm run dev', 'python main.py')",
    ),
});

export type ValidateEnvInput = z.infer<typeof validateEnvInputSchema>;

const varResultSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "missing", "bad_format", "too_short", "skipped"]),
  hint: z.string().optional(),
  required: z.boolean(),
});

const validateEnvOutputSchema = z.object({
  allValid: z.boolean().describe("True when every required var passes all checks"),
  blockers: z
    .array(z.string())
    .describe("Names of required vars that are missing or malformed — execution should be blocked"),
  warnings: z
    .array(z.string())
    .describe("Names of optional vars that are missing or malformed — execution can proceed but feature may be degraded"),
  results: z.array(varResultSchema),
  summary: z.string(),
});

export type ValidateEnvOutput = z.infer<typeof validateEnvOutputSchema>;

// ─── Bash validation script builder ──────────────────────────────────────────

function resolveValidator(req: EnvRequirement): FormatValidator | null {
  if (!req.format) return null;

  if (req.format === "auto") {
    return KNOWN_VALIDATORS[req.name] ?? null;
  }

  if (req.format in FORMAT_PRESETS) {
    return FORMAT_PRESETS[req.format];
  }

  // Treat as a regex string
  return {
    pattern: `new RegExp(${JSON.stringify(req.format)}).test(v)`,
    hint: `Must match pattern: ${req.format}`,
  };
}

/**
 * Build a Node.js one-liner that validates env var values without printing them.
 * The script prints a JSON object: { VAR_NAME: { status, hint? } }
 *
 * SAFETY: values are NEVER included in output — only status strings and hints.
 */
function buildValidationScript(
  requirements: EnvRequirement[],
): string | null {
  const checksToRun = requirements.filter((r) => {
    const hasFormatCheck = r.format !== undefined || KNOWN_VALIDATORS[r.name] !== undefined;
    const hasLengthCheck = r.minLength !== undefined;
    return hasFormatCheck || hasLengthCheck;
  });

  if (checksToRun.length === 0) return null;

  const checks = checksToRun.map((req) => {
    const validator = resolveValidator({ ...req, format: req.format ?? "auto" });
    const parts: string[] = [];

    if (validator) {
      parts.push(`if(!(${validator.pattern}))return{status:'bad_format',hint:${JSON.stringify(validator.hint)}}`);
    }

    if (req.minLength !== undefined) {
      parts.push(
        `if(v.length<${req.minLength})return{status:'too_short',hint:'Must be at least ${req.minLength} characters (got '+v.length+')'}`,
      );
    }

    const body = parts.length > 0 ? parts.join(";") + ";return{status:'ok'}" : "return{status:'ok'}";

    return `${JSON.stringify(req.name)}:(function(){const v=process.env[${JSON.stringify(req.name)}]||'';if(!v)return{status:'skipped'};${body}})()`;
  });

  return `node -e "try{const r={${checks.join(",")}};process.stdout.write(JSON.stringify(r))}catch(e){process.stdout.write(JSON.stringify({__error:e.message}))}"`;
}

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

// ─── Tool definition ──────────────────────────────────────────────────────────

export const validateEnvTool = tool({
  description: `Validate required environment variables before executing code. Checks both PRESENCE and FORMAT without ever exposing the actual values.

WHEN TO USE — call this immediately before any of these actions:
- Starting a dev server or production server (npm run dev, node app.js, python main.py, etc.)
- Running a script that calls an external API for the first time
- Testing a newly added integration

WHAT IT CHECKS:
1. Presence — is the var configured and injected into the sandbox?
2. Format — does the value match the expected pattern? (e.g. Stripe keys start with sk_live_ or sk_test_, OpenAI keys start with sk-)
3. Minimum length — is the value long enough? (e.g. JWT secrets must be ≥32 chars)

USAGE:
- Set format: "auto" to use the built-in validator for known keys (OPENAI_API_KEY, STRIPE_SECRET_KEY, DATABASE_URL, etc.)
- Set format: "url" for URL-shaped vars, "jwt-secret" for signing keys, "uuid" for IDs
- Omit format to do presence-only checks
- Set required: false for optional integrations (the result appears as a warning, not a blocker)

AFTER VALIDATION:
- If allValid is true → proceed with execution
- If blockers is non-empty → fix before running: call request_secrets for missing keys, or tell the user the correct format
- If warnings only → proceed but note which optional features will be degraded`,

  inputSchema: validateEnvInputSchema,
  outputSchema: validateEnvOutputSchema,

  execute: async ({ requirements, context }, { experimental_context }) => {
    const availableSecrets = new Set(getAvailableSecrets(experimental_context));

    // ── Phase 1: Presence check (from context, no I/O) ───────────────────────
    const presenceMap = new Map<string, "present" | "missing">();
    for (const req of requirements) {
      presenceMap.set(req.name, availableSecrets.has(req.name) ? "present" : "missing");
    }

    // ── Phase 2: Format check (bash script in sandbox) ───────────────────────
    const formatMap = new Map<string, { status: string; hint?: string }>();

    const scriptCmd = buildValidationScript(requirements);
    if (scriptCmd) {
      try {
        const sandbox = await getSandbox(experimental_context, "validate_env");
        const result = await sandbox.exec(
          scriptCmd,
          sandbox.workingDirectory,
          VALIDATION_TIMEOUT_MS,
        );

        if (result.success && result.stdout.trim()) {
          const parsed = JSON.parse(result.stdout.trim()) as Record<
            string,
            { status: string; hint?: string }
          >;
          if (!parsed.__error) {
            for (const [name, r] of Object.entries(parsed)) {
              formatMap.set(name, r);
            }
          }
        }
      } catch {
        // Format validation failed — presence check still valid, skip format
      }
    }

    // ── Phase 3: Aggregate results ────────────────────────────────────────────
    const results: ValidateEnvOutput["results"] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    for (const req of requirements) {
      const presence = presenceMap.get(req.name) ?? "missing";
      const format = formatMap.get(req.name);

      let status: "ok" | "missing" | "bad_format" | "too_short" | "skipped";
      let hint: string | undefined;

      if (presence === "missing") {
        status = "missing";
        hint = req.description
          ? `${req.description} — add in Settings → Secrets`
          : "Not configured — add in Settings → Secrets";
      } else if (format && format.status !== "ok" && format.status !== "skipped") {
        status = format.status as "bad_format" | "too_short";
        hint = format.hint;
      } else {
        status = "ok";
      }

      results.push({ name: req.name, status, hint, required: req.required ?? true });

      if (status !== "ok" && status !== "skipped") {
        if (req.required !== false) {
          blockers.push(req.name);
        } else {
          warnings.push(req.name);
        }
      }
    }

    const allValid = blockers.length === 0;

    const ctxNote = context ? ` before running "${context}"` : "";
    const summaryParts: string[] = [];
    if (allValid && warnings.length === 0) {
      summaryParts.push(`All ${results.length} env var(s) are valid${ctxNote}. Safe to proceed.`);
    } else {
      if (blockers.length > 0) {
        summaryParts.push(`BLOCKED: ${blockers.join(", ")} must be fixed before execution.`);
      }
      if (warnings.length > 0) {
        summaryParts.push(`WARNINGS (optional): ${warnings.join(", ")} — feature may be degraded.`);
      }
    }

    return {
      allValid,
      blockers,
      warnings,
      results,
      summary: summaryParts.join(" "),
    };
  },

  toModelOutput: ({ output }) => {
    if (!output) return { type: "text", value: "Env validation could not complete." };

    const lines: string[] = [`Env validation: ${output.summary}`];

    for (const r of output.results) {
      const icon = r.status === "ok" ? "✓" : "✗";
      const suffix = r.hint ? ` — ${r.hint}` : "";
      const optTag = !r.required ? " (optional)" : "";
      lines.push(`  ${icon} ${r.name}${optTag}: ${r.status}${suffix}`);
    }

    if (!output.allValid && output.blockers.length > 0) {
      lines.push(
        `\nNext step: ${output.blockers.some((n) => output.results.find((r) => r.name === n && r.status === "missing")) ? "call request_secrets for the missing vars, then retry" : "tell the user the correct format for the failing keys and ask them to update in Settings → Secrets"}`,
      );
    }

    return { type: "text", value: lines.join("\n") };
  },
});
