import { tool } from "ai";
import { z } from "zod";
import { downloadUrlToSandbox } from "./binary-utils";
import { getSandbox, toDisplayPath } from "./utils";

const OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = process.env.OPENAI_VIDEO_MODEL || "sora-2";
const POLL_INTERVAL_MS = 4_000;
const MAX_POLL_DURATION_MS = 10 * 60_000; // 10 minutes

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it as a secret to enable video generation.",
    );
  }
  return key;
}

interface VideoJob {
  id: string;
  status: string;
  error?: { message?: string } | null;
}

async function openaiFetch(
  path: string,
  init: RequestInit,
  abortSignal?: AbortSignal,
): Promise<Response> {
  const apiKey = getApiKey();
  return fetch(`${OPENAI_BASE}${path}`, {
    ...init,
    signal: abortSignal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  });
}

export const generateVideoTool = tool({
  description: `Generate a short video clip with OpenAI Sora 2 and save it into the project.

USE FOR (during cloning):
- Complex animations on the competitor site that are too detailed to code (looping motion backgrounds, particle effects, ambient animations, video hero clips)
- Animated background panels for sections where the competitor uses video

USAGE:
- Provide a detailed prompt of the desired motion / scene
- The clip is saved as MP4 in the project (default suggestion: public/cloned-assets/<filename>.mp4)
- This call POLLS until the video is ready (typically 30s–5min). Be patient.

WARNING: Use sparingly — generation is slow and costly. Prefer CSS/Lottie animations for anything code can produce.`,
  inputSchema: z.object({
    prompt: z.string().describe("Detailed description of the desired video"),
    filePath: z
      .string()
      .describe(
        "Workspace-relative path to save the MP4 (e.g., public/cloned-assets/hero-loop.mp4)",
      ),
    seconds: z
      .enum(["4", "8", "12"])
      .optional()
      .describe("Clip length in seconds. Default: 8"),
    size: z
      .enum(["720x1280", "1280x720", "1024x1024"])
      .optional()
      .describe("Resolution. Default: 1280x720"),
    model: z
      .string()
      .optional()
      .describe(`Override the OpenAI video model. Default: ${DEFAULT_MODEL}`),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      filePath: z.string(),
      bytes: z.number(),
      jobId: z.string(),
      model: z.string(),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async (
    { prompt, filePath, seconds = "8", size = "1280x720", model },
    { experimental_context, abortSignal },
  ) => {
    try {
      const sandbox = await getSandbox(experimental_context, "generate_video");
      const useModel = model || DEFAULT_MODEL;

      // 1. Create the job
      const createRes = await openaiFetch(
        "/videos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: useModel,
            prompt,
            seconds,
            size,
          }),
        },
        abortSignal,
      );
      const createText = await createRes.text();
      if (!createRes.ok) {
        throw new Error(
          `Sora job creation failed (${createRes.status}): ${createText.slice(0, 500)}`,
        );
      }
      const job = JSON.parse(createText) as VideoJob;

      // 2. Poll until complete
      const startedAt = Date.now();
      let currentJob = job;
      while (
        currentJob.status !== "completed" &&
        currentJob.status !== "failed"
      ) {
        if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
          throw new Error(
            `Sora job ${job.id} timed out after ${MAX_POLL_DURATION_MS}ms (status: ${currentJob.status})`,
          );
        }
        if (abortSignal?.aborted) {
          throw new Error("Aborted while polling Sora job");
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const pollRes = await openaiFetch(
          `/videos/${encodeURIComponent(job.id)}`,
          { method: "GET" },
          abortSignal,
        );
        if (!pollRes.ok) {
          const t = await pollRes.text();
          throw new Error(
            `Sora poll failed (${pollRes.status}): ${t.slice(0, 300)}`,
          );
        }
        currentJob = (await pollRes.json()) as VideoJob;
      }

      if (currentJob.status === "failed") {
        throw new Error(
          `Sora job failed: ${currentJob.error?.message ?? "unknown"}`,
        );
      }

      // 3. Download the content
      const apiKey = getApiKey();
      const bytes = await downloadUrlToSandbox(
        sandbox,
        `${OPENAI_BASE}/videos/${encodeURIComponent(job.id)}/content`,
        filePath,
        abortSignal,
        { Authorization: `Bearer ${apiKey}` },
      );

      return {
        success: true as const,
        filePath: toDisplayPath(filePath, sandbox.workingDirectory),
        bytes,
        jobId: job.id,
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
