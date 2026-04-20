import { tool } from "ai";
import { z } from "zod";
import { getSandbox, shellEscape } from "./utils";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const DEFAULT_MODEL =
  process.env.CRITIC_MODEL || "claude-opus-4-5-20250929";
const REQUEST_TIMEOUT_MS = 120_000;
const PASS_THRESHOLD = 85;

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Required for the critic loop.",
    );
  }
  return key;
}

type ImageRef =
  | { kind: "url"; url: string }
  | { kind: "base64"; mediaType: string; data: string };

function detectMediaType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

async function loadImage(
  ref: { url?: string; sandboxPath?: string },
  sandbox: Awaited<ReturnType<typeof getSandbox>>,
): Promise<ImageRef> {
  if (ref.url) {
    return { kind: "url", url: ref.url };
  }
  if (ref.sandboxPath) {
    // Read the file from sandbox as base64
    const result = await sandbox.exec(
      `base64 -w 0 ${shellEscape(ref.sandboxPath)}`,
      sandbox.workingDirectory,
      30_000,
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to read ${ref.sandboxPath}: ${result.stderr.slice(0, 200)}`,
      );
    }
    return {
      kind: "base64",
      mediaType: detectMediaType(ref.sandboxPath),
      data: result.stdout.trim(),
    };
  }
  throw new Error("Image reference must have either url or sandboxPath");
}

function imageToContent(image: ImageRef) {
  if (image.kind === "url") {
    return {
      type: "image" as const,
      source: { type: "url" as const, url: image.url },
    };
  }
  return {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: image.mediaType,
      data: image.data,
    },
  };
}

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

export const critiqueCloneTool = tool({
  description: `Score how closely a built section matches the competitor reference, using a vision model.

USE AFTER CODING EACH SECTION (during the cloning workflow):
- Pass the competitor's section screenshot (URL from firecrawl_scrape, or sandbox file path)
- Pass YOUR built section's screenshot (URL or sandbox file path; capture via firecrawl_scrape on your dev server domain)
- Get a 0-100 closeness score plus a list of concrete differences and suggested fixes

Decision rule:
- score >= ${PASS_THRESHOLD}: section is good enough, mark the todo complete and move on
- score <  ${PASS_THRESHOLD}: iterate on the section, fixing the highest-impact differences first, then re-run this tool

Each image must be provided either by URL or by a workspace-relative sandboxPath (PNG/JPEG/WEBP).`,
  inputSchema: z.object({
    sectionName: z
      .string()
      .describe("Name of the section being critiqued (e.g., 'hero', 'pricing')"),
    competitor: z
      .object({
        url: z.string().url().optional(),
        sandboxPath: z.string().optional(),
      })
      .describe("Reference image of the competitor's section"),
    candidate: z
      .object({
        url: z.string().url().optional(),
        sandboxPath: z.string().optional(),
      })
      .describe("Image of YOUR built section"),
    notes: z
      .string()
      .optional()
      .describe("Optional context for the critic (constraints, intent)"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      score: z.number(),
      passes: z.boolean(),
      threshold: z.number(),
      summary: z.string(),
      differences: z.array(
        z.object({
          aspect: z.string(),
          severity: z.enum(["critical", "major", "minor"]),
          description: z.string(),
          fix: z.string(),
        }),
      ),
      raw: z.string(),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    { sectionName, competitor, candidate, notes },
    { experimental_context, abortSignal },
  ) => {
    try {
      const sandbox = await getSandbox(experimental_context, "critique_clone");
      const apiKey = getApiKey();

      const [competitorImage, candidateImage] = await Promise.all([
        loadImage(competitor, sandbox),
        loadImage(candidate, sandbox),
      ]);

      const systemPrompt = `You are a meticulous design critic comparing a "candidate" website section against a "competitor reference" section. Score 0-100 (100 = pixel-near-identical, 80+ = visually equivalent, 60 = recognizable but off, <50 = wrong direction). Be strict on colors (hex), typography, spacing, layout structure, copy hierarchy, and visual density. Respond ONLY in valid JSON with this exact shape: {"score": number, "summary": string, "differences": [{"aspect": string, "severity": "critical"|"major"|"minor", "description": string, "fix": string}]}.`;

      const userText = `Section being cloned: "${sectionName}".${notes ? `\n\nContext: ${notes}` : ""}\n\nThe FIRST image is the competitor reference. The SECOND image is the candidate (what we built). Score the candidate's closeness to the reference and list concrete differences with fixes. Output JSON only.`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      abortSignal?.addEventListener("abort", () => controller.abort(), {
        once: true,
      });

      let payload: ClaudeResponse;
      try {
        const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: [
                  imageToContent(competitorImage),
                  imageToContent(candidateImage),
                  { type: "text", text: userText },
                ],
              },
            ],
          }),
          signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(
            `Claude critic failed (${res.status}): ${text.slice(0, 500)}`,
          );
        }
        payload = JSON.parse(text) as ClaudeResponse;
      } finally {
        clearTimeout(timeout);
      }

      const raw =
        payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
      // Try to extract JSON even if the model wraps it in fences
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Critic returned no JSON: ${raw.slice(0, 200)}`);
      }
      const parsed = JSON.parse(jsonMatch[0]) as {
        score?: number;
        summary?: string;
        differences?: Array<{
          aspect?: string;
          severity?: string;
          description?: string;
          fix?: string;
        }>;
      };
      const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
      const differences = (parsed.differences ?? []).map((d) => ({
        aspect: d.aspect ?? "unknown",
        severity:
          d.severity === "critical" || d.severity === "major"
            ? d.severity
            : ("minor" as const),
        description: d.description ?? "",
        fix: d.fix ?? "",
      }));

      return {
        success: true as const,
        score,
        passes: score >= PASS_THRESHOLD,
        threshold: PASS_THRESHOLD,
        summary: parsed.summary ?? "",
        differences,
        raw,
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
