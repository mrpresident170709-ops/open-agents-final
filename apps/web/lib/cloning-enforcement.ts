import "server-only";

import type { ModelMessage } from "ai";

/**
 * Tools the agent MUST have called at least once before it is allowed to
 * declare the cloning task done. If any of these is still at zero when the
 * model tries to stop, we inject a synthetic user message and force another
 * loop iteration. Capped by `MAX_NUDGES` to avoid infinite loops when a
 * requirement genuinely can't be satisfied.
 */
export const REQUIRED_TOOL_CALLS = [
  "firecrawl_scrape",
  "generate_image",
  "critique_clone",
] as const;

export type RequiredToolName = (typeof REQUIRED_TOOL_CALLS)[number];

export const MAX_NUDGES = 4;

interface ToolUsage {
  counts: Record<string, number>;
  brandIntakeAsked: boolean;
  fabricatedBrandHits: string[];
}

const FABRICATED_BRAND_PATTERNS = [
  /\bFlowSync\b/i,
  /\bFlowForge\b/i,
  /\bSyncFlow\b/i,
  /\bAcme\b/i,
  /\bFooBar\b/i,
];

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("\n");
}

function deepCollectText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) deepCollectText(item, out);
    return;
  }
  if (typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      deepCollectText(value, out);
    }
  }
}

function tallyToolUsage(modelMessages: ModelMessage[]): ToolUsage {
  const counts: Record<string, number> = {};
  let brandIntakeAsked = false;
  const fabricatedHits = new Set<string>();

  for (const m of modelMessages) {
    const c: unknown = (m as { content?: unknown }).content;

    // Always scan everything in this message for fabricated brand names —
    // string content (assistant text), structured tool-result payloads,
    // nested objects all count.
    const buf: string[] = [];
    deepCollectText(c, buf);
    const flat = buf.join("\n");
    for (const re of FABRICATED_BRAND_PATTERNS) {
      const match = flat.match(re);
      if (match) fabricatedHits.add(match[0]);
    }

    if (!Array.isArray(c)) continue;

    for (const part of c) {
      if (!part || typeof part !== "object") continue;
      const partType = (part as { type?: unknown }).type;
      const toolName = (part as { toolName?: unknown }).toolName;

      if (
        (partType === "tool-call" || partType === "tool-result") &&
        typeof toolName === "string"
      ) {
        counts[toolName] = (counts[toolName] ?? 0) + 1;

        if (
          partType === "tool-call" &&
          toolName === "ask_user_question" &&
          !brandIntakeAsked
        ) {
          const input = (part as { input?: unknown }).input;
          const inputText = JSON.stringify(input ?? {});
          if (/brand|product name|company name/i.test(inputText)) {
            brandIntakeAsked = true;
          }
        }
      }
    }
  }

  return {
    counts,
    brandIntakeAsked,
    fabricatedBrandHits: [...fabricatedHits],
  };
}

/**
 * Detect whether the user's first message is requesting a landing page clone.
 * Used to gate the cloning playbook so it only activates for landing-page
 * requests, not general coding tasks.
 */
export function isLandingPageRequest(text: string): boolean {
  const lower = text.toLowerCase();

  // Direct landing-page mentions
  if (lower.includes("landing page") || lower.includes("landing-page"))
    return true;
  if (lower.includes("hero section") || lower.includes("hero banner"))
    return true;
  if (lower.includes("single page website") || lower.includes("single-page"))
    return true;

  // Clone / copy / replicate intent combined with a site reference
  const hasCloneVerb =
    /\b(clone|copy|replicate|recreate|re-create|build like|look like|similar to)\b/.test(
      lower,
    );
  const hasSiteNoun =
    /\b(website|site|landing|homepage|home page)\b/.test(lower) ||
    /https?:\/\//.test(lower);

  if (hasCloneVerb && hasSiteNoun) return true;

  // Explicit URL + build/create/make intent
  if (
    /https?:\/\/\S+/.test(lower) &&
    /\b(clone|copy|build|create|make)\b/.test(lower)
  )
    return true;

  return false;
}

/**
 * Heuristic: detect whether a chat is mid-clone-workflow based on prior
 * assistant tool calls. Used to keep enforcement active on follow-up turns
 * (e.g. after `ask_user_question` returns the brand name) since the
 * `isFirstUserMessageOfSession` flag is false by then.
 */
const CLONE_SIGNAL_TOOLS = new Set([
  "firecrawl_search",
  "firecrawl_map",
  "firecrawl_scrape",
  "generate_image",
  "generate_video",
  "critique_clone",
]);

export function chatHasCloneSignals(
  existingChatMessages: Array<{ parts?: unknown }>,
): boolean {
  for (const m of existingChatMessages) {
    const parts = m.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const t = (part as { type?: unknown }).type;
      if (typeof t !== "string") continue;
      if (t.startsWith("tool-")) {
        const tn = t.slice("tool-".length);
        if (CLONE_SIGNAL_TOOLS.has(tn)) return true;
      }
      const toolName = (part as { toolName?: unknown }).toolName;
      if (typeof toolName === "string" && CLONE_SIGNAL_TOOLS.has(toolName)) {
        return true;
      }
    }
  }
  return false;
}

export interface EnforcementResult {
  satisfied: boolean;
  nudge?: string;
}

export function evaluateCloningEnforcement(
  modelMessages: ModelMessage[],
): EnforcementResult {
  const usage = tallyToolUsage(modelMessages);
  const missing: string[] = [];

  for (const tool of REQUIRED_TOOL_CALLS) {
    if (!usage.counts[tool]) missing.push(tool);
  }

  if (!usage.brandIntakeAsked) missing.push("ask_user_question (brand name)");

  if (missing.length === 0 && usage.fabricatedBrandHits.length === 0) {
    return { satisfied: true };
  }

  const lines: string[] = [
    "⚠️ STOP — you cannot end the run yet. Your output does not satisfy the cloning playbook.",
    "",
  ];

  if (missing.length > 0) {
    lines.push(`Missing required tool calls: ${missing.join(", ")}.`);
    if (missing.includes("firecrawl_scrape"))
      lines.push(
        "  → Call `firecrawl_scrape` on the chosen competitor's homepage (and other pages from `firecrawl_map`) before any code is written.",
      );
    if (missing.includes("generate_image"))
      lines.push(
        "  → Call `generate_image` (Nano Banana 2) for every visual section: hero illustration, product mockups, decorative imagery, customer logos. Empty `<div>`s where the competitor has imagery is failure (rule 8).",
      );
    if (missing.includes("critique_clone"))
      lines.push(
        "  → Call `critique_clone` for EACH section in `SITE_MAP.md` and iterate until score ≥ 85 (rule 5).",
      );
    if (missing.find((m) => m.startsWith("ask_user_question")))
      lines.push(
        "  → Call `ask_user_question` to collect the user's actual brand name. Do NOT ship `{{BRAND}}` placeholders or invented names (rule 13).",
      );
  }

  if (usage.fabricatedBrandHits.length > 0) {
    lines.push(
      `Fabricated brand name(s) detected in your output: ${usage.fabricatedBrandHits.join(", ")}.`,
    );
    lines.push(
      "  → Replace every occurrence with the user's real brand name (collect it via `ask_user_question`) or with the literal `{{BRAND}}` placeholder until you do (rule 13).",
    );
  }

  lines.push("");
  lines.push(
    "Resume work now: address the missing items above. Do NOT respond with text-only — your next message must contain tool calls.",
  );

  return { satisfied: false, nudge: lines.join("\n") };
}
