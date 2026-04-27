import { tool } from "ai";
import { z } from "zod";
import { getExaApiKey } from "../env";

const EXA_CODE_API_BASE = "https://api.exa.ai";
const REQUEST_TIMEOUT_MS = 120_000;

function getApiKey(): string {
  const key = getExaApiKey();
  if (!key) {
    throw new Error(
      "EXA_API_KEY not configured. Set EXA_API_KEY environment variable.",
    );
  }
  return key;
}

async function exaCodeRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<T> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  abortSignal?.addEventListener("abort", () => controller.abort(), {
    once: true,
  });

  try {
    const res = await fetch(`${EXA_CODE_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `EXA Code Search failed (${res.status}): ${text.slice(0, 500)}`,
      );
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const codeSearchTool = tool({
  description: `Search code using Exa's neural code search engine. Returns highly relevant code snippets with explanations.

USE FOR:
- Finding code examples and implementations (e.g., "React useState hook examples")
- Searching for specific patterns across open source repositories
- Finding library usage examples and best practices
- Understanding how to use APIs, frameworks, or libraries

This is a semantic search - it understands code concepts and patterns, not just keywords.

Requires EXA_API_KEY environment variable to be set.`,
  inputSchema: z.object({
    query: z
      .string()
      .describe("Code search query (e.g., 'React useState hook examples')"),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Number of results. Default: 5"),
    tokensNum: z
      .number()
      .int()
      .min(1000)
      .max(50000)
      .optional()
      .describe("Max tokens per result. Default: 5000"),
    language: z
      .string()
      .optional()
      .describe(
        "Filter by programming language (e.g., 'python', 'typescript', 'rust')",
      ),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe("Only search within these repositories/domains"),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe("Exclude these repositories/domains from search"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      results: z.array(
        z.object({
          title: z.string().nullable(),
          url: z.string(),
          repository: z.string().nullable(),
          language: z.string().nullable(),
          text: z.string(),
        }),
      ),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    {
      query,
      numResults = 5,
      tokensNum = 5000,
      language,
      includeDomains,
      excludeDomains,
    },
    { abortSignal },
  ) => {
    try {
      const body: Record<string, unknown> = {
        query,
        numResults,
        type: "code",
        contents: {
          code: {
            tokens: tokensNum,
          },
        },
      };

      if (language) {
        body.includeDomains = [`github.com/*/${language}`];
      }
      if (includeDomains?.length) {
        body.includeDomains = [
          ...((body.includeDomains as string[]) || []),
          ...includeDomains,
        ];
      }
      if (excludeDomains?.length) {
        body.excludeDomains = excludeDomains;
      }

      const data = await exaCodeRequest<{
        results?: Array<{
          title?: string;
          url?: string;
          text?: string;
          metadata?: Record<string, unknown>;
        }>;
      }>("/search", body, abortSignal);

      const results = (data.results ?? []).map((r) => ({
        title: r.title ?? null,
        url: r.url ?? "",
        repository:
          (r.metadata?.repository as string | null) ??
          r.url
            ?.split("github.com/")
            .slice(1, 2)
            .join("")
            .split("/")
            .slice(0, 2)
            .join("/") ??
          null,
        language: (r.metadata?.language as string | null) ?? null,
        text: r.text ?? "",
      }));

      return {
        success: true as const,
        results,
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
