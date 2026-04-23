import { tool } from "ai";
import { z } from "zod";
import { getExaApiKey } from "../env";

const EXA_BASE = "https://api.exa.ai";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TEXT = 4_000;

function getApiKey(): string {
  return getExaApiKey();
}

async function exaRequest<T>(
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
    const res = await fetch(`${EXA_BASE}${endpoint}`, {
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
        `EXA ${endpoint} failed (${res.status}): ${text.slice(0, 500)}`,
      );
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

interface ExaResultItem {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
  image?: string;
  author?: string;
}

function normalizeResults(results: ExaResultItem[]) {
  return results
    .filter((r): r is { url: string } & ExaResultItem => Boolean(r.url))
    .map((r) => ({
      title: r.title ?? null,
      url: r.url,
      publishedDate: r.publishedDate ?? null,
      author: r.author ?? null,
      image: r.image ?? null,
      text: r.text ? r.text.slice(0, MAX_TEXT) : null,
    }));
}

// ---------------------------------------------------------------------------
// exa_search
// ---------------------------------------------------------------------------

export const exaSearchTool = tool({
  description: `Search the web with EXA's neural or keyword search. Returns highly relevant results with extracted text content.

USE FOR:
- Finding downloadable assets (logos, illustrations, stock images) when cloning a section
- Sourcing reference material, components, design inspiration
- Research that is more semantic than a keyword search`,
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of results. Default: 5"),
    type: z
      .enum(["neural", "keyword", "auto"])
      .optional()
      .describe("Search type. Default: auto"),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe("Restrict results to these domains"),
    includeText: z
      .boolean()
      .optional()
      .describe("Include extracted page text in results. Default: true"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      results: z.array(
        z.object({
          title: z.string().nullable(),
          url: z.string(),
          publishedDate: z.string().nullable(),
          author: z.string().nullable(),
          image: z.string().nullable(),
          text: z.string().nullable(),
        }),
      ),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    {
      query,
      numResults = 5,
      type = "auto",
      includeDomains,
      includeText = true,
    },
    { abortSignal },
  ) => {
    try {
      const body: Record<string, unknown> = {
        query,
        numResults,
        type,
        ...(includeDomains?.length ? { includeDomains } : {}),
        ...(includeText
          ? { contents: { text: { maxCharacters: MAX_TEXT } } }
          : {}),
      };
      const data = await exaRequest<{ results?: ExaResultItem[] }>(
        "/search",
        body,
        abortSignal,
      );
      return {
        success: true as const,
        results: normalizeResults(data.results ?? []),
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// exa_find_similar
// ---------------------------------------------------------------------------

export const exaFindSimilarTool = tool({
  description: `Find pages similar to a given URL using EXA's semantic similarity.

USE FOR:
- Discovering more competitors similar to one you have already found
- Finding alternative asset pages similar to one you've identified`,
  inputSchema: z.object({
    url: z.string().url().describe("Reference URL to find similar pages for"),
    numResults: z.number().int().min(1).max(20).optional(),
    includeText: z.boolean().optional(),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      results: z.array(
        z.object({
          title: z.string().nullable(),
          url: z.string(),
          publishedDate: z.string().nullable(),
          author: z.string().nullable(),
          image: z.string().nullable(),
          text: z.string().nullable(),
        }),
      ),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    { url, numResults = 5, includeText = true },
    { abortSignal },
  ) => {
    try {
      const body: Record<string, unknown> = {
        url,
        numResults,
        ...(includeText
          ? { contents: { text: { maxCharacters: MAX_TEXT } } }
          : {}),
      };
      const data = await exaRequest<{ results?: ExaResultItem[] }>(
        "/findSimilar",
        body,
        abortSignal,
      );
      return {
        success: true as const,
        results: normalizeResults(data.results ?? []),
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
