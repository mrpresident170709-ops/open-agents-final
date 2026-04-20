import { tool } from "ai";
import { z } from "zod";

const FIRECRAWL_BASE = "https://api.firecrawl.dev";
const REQUEST_TIMEOUT_MS = 90_000;

function getApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error(
      "FIRECRAWL_API_KEY is not configured. Add it as a secret to enable Firecrawl tools.",
    );
  }
  return key;
}

async function firecrawlRequest<T>(
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
    const res = await fetch(`${FIRECRAWL_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Firecrawl ${endpoint} failed (${res.status}): ${text.slice(0, 500)}`,
      );
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// firecrawl_search
// ---------------------------------------------------------------------------

export const firecrawlSearchTool = tool({
  description: `Search the web with Firecrawl to discover competitors, top sites, and reference material.

USE FOR:
- Finding the top competitor in a category ("top SaaS landing pages 2025")
- Discovering reference websites to clone
- Locating asset/component sources

Returns a list of search results with title, URL, and a short description.`,
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of results to return. Default: 5"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      results: z.array(
        z.object({
          title: z.string().nullable(),
          url: z.string(),
          description: z.string().nullable(),
        }),
      ),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async ({ query, limit = 5 }, { abortSignal }) => {
    try {
      const data = await firecrawlRequest<{
        data?: Array<{ title?: string; url?: string; description?: string }>;
        web?: Array<{ title?: string; url?: string; description?: string }>;
      }>("/v2/search", { query, limit }, abortSignal);
      const items = data.web ?? data.data ?? [];
      return {
        success: true as const,
        results: items
          .filter((r): r is { url: string } & typeof r => Boolean(r.url))
          .map((r) => ({
            title: r.title ?? null,
            url: r.url,
            description: r.description ?? null,
          })),
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
// firecrawl_map
// ---------------------------------------------------------------------------

export const firecrawlMapTool = tool({
  description: `Discover all URLs on a website domain using Firecrawl's sitemap crawl.

USE FOR:
- Mapping a competitor's site structure (homepage, pricing, features, blog, etc.)
- Discovering which pages are present so you can choose which to scrape

Returns a flat list of URLs found on the site.`,
  inputSchema: z.object({
    url: z.string().url().describe("Root URL of the site to map"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max URLs to return. Default: 100"),
    search: z
      .string()
      .optional()
      .describe("Optional substring filter applied to discovered URLs"),
  }),
  outputSchema: z.union([
    z.object({ success: z.literal(true), urls: z.array(z.string()) }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async ({ url, limit = 100, search }, { abortSignal }) => {
    try {
      const data = await firecrawlRequest<{
        links?: string[];
        data?: { links?: string[] };
      }>(
        "/v2/map",
        {
          url,
          limit,
          ...(search ? { search } : {}),
        },
        abortSignal,
      );
      const urls = data.links ?? data.data?.links ?? [];
      return { success: true as const, urls };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// firecrawl_scrape
// ---------------------------------------------------------------------------

const MAX_MARKDOWN = 30_000;

export const firecrawlScrapeTool = tool({
  description: `Scrape a single URL with Firecrawl. Returns markdown content, a screenshot URL, and discovered links.

USE FOR:
- Extracting a competitor section's design (markdown + screenshot for visual reference)
- Pulling hex colors, fonts, copy, and layout cues from a page
- Capturing the full-page screenshot used by the critic loop

The screenshot URL is hosted by Firecrawl and can be passed directly to critique_clone.`,
  inputSchema: z.object({
    url: z.string().url().describe("URL to scrape"),
    fullPage: z
      .boolean()
      .optional()
      .describe("Capture a full-page screenshot. Default: true"),
    includeLinks: z
      .boolean()
      .optional()
      .describe("Include discovered links. Default: true"),
    includeHtml: z
      .boolean()
      .optional()
      .describe(
        "Include the rendered HTML so you can read class names, inline styles, font links, and SVG sources. Default: false. Set true when you are extracting design tokens.",
      ),
    actions: z
      .array(
        z.union([
          z.object({
            type: z.literal("wait"),
            milliseconds: z.number().int().min(0).max(30000),
          }),
          z.object({ type: z.literal("scroll"), direction: z.enum(["up", "down"]) }),
          z.object({ type: z.literal("click"), selector: z.string() }),
          z.object({ type: z.literal("hover"), selector: z.string() }),
          z.object({ type: z.literal("press"), key: z.string() }),
          z.object({ type: z.literal("screenshot"), fullPage: z.boolean().optional() }),
        ]),
      )
      .optional()
      .describe(
        "Optional Firecrawl browser actions executed BEFORE the final scrape. Use to trigger hover/click/scroll states (e.g. open a tab, scroll past a sticky-nav threshold) so the captured HTML/screenshot reflects the post-interaction state.",
      ),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      url: z.string(),
      title: z.string().nullable(),
      markdown: z.string(),
      truncated: z.boolean(),
      screenshotUrl: z.string().nullable(),
      html: z.string().optional(),
      htmlTruncated: z.boolean().optional(),
      links: z.array(z.string()).optional(),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    {
      url,
      fullPage = true,
      includeLinks = true,
      includeHtml = false,
      actions,
    },
    { abortSignal },
  ) => {
    try {
      const formats: Array<unknown> = [
        "markdown",
        { type: "screenshot", fullPage },
      ];
      if (includeLinks) formats.push("links");
      if (includeHtml) formats.push("html");
      const body: Record<string, unknown> = { url, formats };
      if (actions && actions.length > 0) body.actions = actions;
      const data = await firecrawlRequest<{
        data?: {
          markdown?: string;
          html?: string;
          screenshot?: string;
          links?: string[];
          metadata?: { title?: string; sourceURL?: string };
        };
      }>("/v2/scrape", body, abortSignal);
      const d = data.data ?? {};
      const md = d.markdown ?? "";
      const truncated = md.length > MAX_MARKDOWN;
      const MAX_HTML = 60_000;
      const html = d.html ?? "";
      const htmlTruncated = html.length > MAX_HTML;
      return {
        success: true as const,
        url: d.metadata?.sourceURL ?? url,
        title: d.metadata?.title ?? null,
        markdown: truncated ? md.slice(0, MAX_MARKDOWN) : md,
        truncated,
        screenshotUrl: d.screenshot ?? null,
        ...(includeHtml
          ? {
              html: htmlTruncated ? html.slice(0, MAX_HTML) : html,
              htmlTruncated,
            }
          : {}),
        ...(includeLinks ? { links: d.links ?? [] } : {}),
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
