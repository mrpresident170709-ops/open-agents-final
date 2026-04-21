import { tool } from "ai";
import { z } from "zod";
import * as path from "path";
import { writeBinaryToSandbox, downloadUrlToSandbox } from "./binary-utils";
import { getSandbox, toDisplayPath, shellEscape } from "./utils";

const TOGETHER_BASE = "https://api.together.xyz/v1";
// Together AI's serverless id for "Nano Banana 2" / Gemini Flash Image 3.1.
// IMPORTANT: this model rejects the `steps` parameter — only pass it when the
// caller is using a model that does support it.
const DEFAULT_MODEL =
  process.env.TOGETHER_IMAGE_MODEL || "google/flash-image-3.1";
const REQUEST_TIMEOUT_MS = 180_000;

/**
 * Models that do NOT accept the `steps` parameter at the Together /images
 * endpoint. Flux/Gemini Flash family are sampled internally and reject `steps`.
 */
const MODELS_WITHOUT_STEPS = new Set<string>([
  "google/flash-image-3.1",
  "google/flash-image-2.5",
  "google/gemini-3-pro-image",
  "google/imagen-4.0-fast",
  "google/imagen-4.0-preview",
  "google/imagen-4.0-ultra",
]);

function getApiKey(): string {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) {
    throw new Error(
      "TOGETHER_API_KEY is not configured. Add it as a secret to enable image generation.",
    );
  }
  return key;
}

interface TogetherImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string } | string;
}

export const generateImageTool = tool({
  description: `Generate an image with Nano Banana 2 (Gemini Flash Image) via Together AI and save it into the project.

USE FOR (during cloning):
- Complex section backgrounds (abstract gradients, AI-painted scenes, patterned backdrops) too detailed for code or stock images
- Hero illustrations and brand-quality visuals when an exact match isn't available via Firecrawl/EXA
- Replacing copyrighted imagery from the competitor with original equivalents

CRITICAL — ALWAYS pass reference images when cloning:
- Nano Banana 2 is an *image-conditioned* model. Text-only prompts produce
  generic results. To accurately clone a competitor's visual, you MUST pass
  the Firecrawl screenshot URL (or any reference URL/path) via
  \`referenceImages\`. The model will then match composition, palette, lighting,
  and style instead of guessing from words.
- Workflow: \`firecrawl_scrape({ url, fullPage: true })\` → take
  \`screenshotUrl\` → call \`generate_image({ prompt, referenceImages: [screenshotUrl], ... })\`.
- For section-level cloning (hero bg, feature illustration, testimonial bg)
  pass the section screenshot. For full-page recreation pass the full-page
  screenshot. You may pass up to 4 reference URLs (e.g., the section + an
  inspiration crop + a brand-asset reference).

USAGE:
- Provide a detailed prompt describing the desired image (style, colors, mood, composition)
- The image is saved as a PNG in the project (default: public/cloned-assets/<filename>.png)
- The agent's app code can then reference it via a public path

The model generates square (1024x1024) images by default; pass width/height to override.`,
  inputSchema: z.object({
    prompt: z.string().describe("Detailed description of the image to generate"),
    filePath: z
      .string()
      .describe(
        "Workspace-relative path to save the PNG (e.g., public/cloned-assets/hero-bg.png)",
      ),
    referenceImages: z
      .array(z.string())
      .max(4)
      .optional()
      .describe(
        "Reference images to condition generation on. Accepts public HTTPS URLs (e.g., the Firecrawl screenshotUrl) or workspace-relative paths to PNG/JPG files. STRONGLY RECOMMENDED during cloning — pass the Firecrawl screenshot of the section you are recreating so the model matches its layout, palette, and style.",
      ),
    width: z.number().int().min(256).max(2048).optional(),
    height: z.number().int().min(256).max(2048).optional(),
    steps: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Diffusion steps. Default: 4 (Nano Banana 2 is fast)"),
    model: z
      .string()
      .optional()
      .describe(`Override the Together model id. Default: ${DEFAULT_MODEL}`),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      filePath: z.string(),
      bytes: z.number(),
      model: z.string(),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    {
      prompt,
      filePath,
      referenceImages,
      width = 1024,
      height = 1024,
      steps = 4,
      model,
    },
    { experimental_context, abortSignal },
  ) => {
    try {
      const sandbox = await getSandbox(experimental_context, "generate_image");
      const apiKey = getApiKey();
      const useModel = model || DEFAULT_MODEL;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      abortSignal?.addEventListener("abort", () => controller.abort(), {
        once: true,
      });

      // Resolve reference images: HTTPS URLs pass through as-is; workspace
      // paths are read from the sandbox and inlined as base64 data URLs.
      const resolvedRefs: string[] = [];
      if (referenceImages && referenceImages.length > 0) {
        for (const ref of referenceImages) {
          if (/^https?:\/\//i.test(ref) || ref.startsWith("data:")) {
            resolvedRefs.push(ref);
            continue;
          }
          const absolute = path.isAbsolute(ref)
            ? ref
            : path.join(sandbox.workingDirectory, ref);
          const result = await sandbox.exec(
            `base64 -w 0 ${shellEscape(absolute)}`,
            sandbox.workingDirectory,
            30_000,
          );
          if (result.exitCode !== 0 || !result.stdout) {
            throw new Error(
              `Failed to read reference image "${ref}": ${result.stderr || "empty output"}`,
            );
          }
          const ext = path.extname(absolute).toLowerCase().replace(".", "");
          const mime =
            ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "webp"
                ? "image/webp"
                : ext === "gif"
                  ? "image/gif"
                  : "image/png";
          resolvedRefs.push(`data:${mime};base64,${result.stdout.trim()}`);
        }
      }

      let payload: TogetherImageResponse;
      try {
        const supportsSteps = !MODELS_WITHOUT_STEPS.has(useModel);
        const body: Record<string, unknown> = {
          model: useModel,
          prompt,
          width,
          height,
          n: 1,
          response_format: "b64_json",
        };
        if (supportsSteps) {
          body.steps = steps;
        }
        if (resolvedRefs.length > 0) {
          // Together AI's image-conditioned models (Nano Banana 2 /
          // google/flash-image-3.1, Gemini 3 Pro Image, Imagen 4 family)
          // accept reference imagery via `image_url` — single string for one
          // reference, array for multiple.
          body.image_url =
            resolvedRefs.length === 1 ? resolvedRefs[0] : resolvedRefs;
        }
        const res = await fetch(`${TOGETHER_BASE}/images/generations`, {
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
            `Together AI image gen failed (${res.status}): ${text.slice(0, 500)}`,
          );
        }
        payload = JSON.parse(text) as TogetherImageResponse;
      } finally {
        clearTimeout(timeout);
      }

      const item = payload.data?.[0];
      if (!item) {
        const err =
          typeof payload.error === "string"
            ? payload.error
            : payload.error?.message || "No image returned";
        throw new Error(err);
      }

      let bytes: number;
      if (item.b64_json) {
        const buffer = Buffer.from(item.b64_json, "base64");
        await writeBinaryToSandbox(sandbox, filePath, buffer);
        bytes = buffer.byteLength;
      } else if (item.url) {
        bytes = await downloadUrlToSandbox(
          sandbox,
          item.url,
          filePath,
          abortSignal,
        );
      } else {
        throw new Error("Image response had neither b64_json nor url");
      }

      return {
        success: true as const,
        filePath: toDisplayPath(filePath, sandbox.workingDirectory),
        bytes,
        model: useModel,
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
