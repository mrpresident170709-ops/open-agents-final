import { tool } from "ai";
import { z } from "zod";

const PEXELS_BASE = "https://api.pexels.com";
const REQUEST_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    throw new Error(
      "PEXELS_API_KEY is not configured. " +
      "Add it to your environment variables or set it as a user secret in /settings/secrets.",
    );
  }
  return key;
}

async function pexelsFetch<T>(
  path: string,
  abortSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  abortSignal?.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  try {
    const res = await fetch(`${PEXELS_BASE}${path}`, {
      headers: {
        Authorization: getApiKey(),
      },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Pexels API error (${res.status}): ${text.slice(0, 400)}`);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
}

interface PexelsVideoFile {
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  duration: number;
  video_files: PexelsVideoFile[];
}

export const pexelsPhotoSearchTool = tool({
  description: `Search Pexels for high-quality, free stock photos. Returns URLs you can directly use in <img> tags or download into the project.

USE FOR:
- Real-world photos for landing page sections (people, workspaces, products, lifestyle)
- Hero background images
- Testimonial profile photos
- Blog post cover images
- Any place an authentic photo would look better than a generated one

ALWAYS PREFER this over AI-generated images when the subject is:
- Real people, teams, or faces
- Offices / workspaces
- Nature / lifestyle scenes
- Products on a surface (where photo-realism matters more than brand customisation)

USAGE NOTES:
- Use the \`large2x\` URL for hero/full-width images (high res)
- Use the \`large\` URL for section images (medium res, faster load)
- Use the \`medium\` URL for card thumbnails
- You can use the URL directly in <img src="..."> or <div style={{backgroundImage: "url(...)"}}>
- Always set \`alt\` from the returned \`alt\` field for accessibility`,
  inputSchema: z.object({
    query: z.string().describe("What to search for, e.g. 'team working in office', 'SaaS product laptop'"),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(15)
      .optional()
      .describe("Number of results. Default: 5"),
    orientation: z
      .enum(["landscape", "portrait", "square"])
      .optional()
      .describe("Filter by orientation. Default: landscape for hero/banner images"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      photos: z.array(
        z.object({
          id: z.number(),
          width: z.number(),
          height: z.number(),
          alt: z.string(),
          photographer: z.string(),
          pexelsUrl: z.string(),
          urls: z.object({
            original: z.string(),
            large2x: z.string(),
            large: z.string(),
            medium: z.string(),
            small: z.string(),
          }),
        }),
      ),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async ({ query, perPage = 5, orientation }, { abortSignal }) => {
    try {
      const params = new URLSearchParams({
        query,
        per_page: String(perPage),
        ...(orientation ? { orientation } : {}),
      });
      const data = await pexelsFetch<{ photos: PexelsPhoto[] }>(
        `/v1/search?${params}`,
        abortSignal,
      );
      return {
        success: true as const,
        photos: (data.photos ?? []).map((p) => ({
          id: p.id,
          width: p.width,
          height: p.height,
          alt: p.alt || query,
          photographer: p.photographer,
          pexelsUrl: p.url,
          urls: {
            original: p.src.original,
            large2x: p.src.large2x,
            large: p.src.large,
            medium: p.src.medium,
            small: p.src.small,
          },
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

export const pexelsVideoSearchTool = tool({
  description: `Search Pexels for free stock videos to use as looping background videos or visual accents.

USE FOR:
- Video hero backgrounds (looping ambient footage — cityscape, abstract, nature, office)
- Section background clips
- Anywhere the competitor site uses a looping video instead of a static image

USAGE NOTES:
- Pick the \`hd\` quality file (1920×1080) for full-screen backgrounds
- Pick \`sd\` (1280×720 or smaller) for smaller contained video areas
- Use the \`link\` URL in a <video autoPlay loop muted playsInline> tag
- Always pair with a poster/fallback image in case video can't load
- Keep video backgrounds \`muted\` and \`autoPlay loop\` — never autoplay with sound`,
  inputSchema: z.object({
    query: z.string().describe("What to search for, e.g. 'abstract blue particles', 'city timelapse night'"),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results. Default: 3"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      videos: z.array(
        z.object({
          id: z.number(),
          width: z.number(),
          height: z.number(),
          duration: z.number(),
          pexelsUrl: z.string(),
          hdFile: z.object({ link: z.string(), width: z.number(), height: z.number() }).nullable(),
          sdFile: z.object({ link: z.string(), width: z.number(), height: z.number() }).nullable(),
        }),
      ),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async ({ query, perPage = 3 }, { abortSignal }) => {
    try {
      const params = new URLSearchParams({
        query,
        per_page: String(perPage),
      });
      const data = await pexelsFetch<{ videos: PexelsVideo[] }>(
        `/videos/search?${params}`,
        abortSignal,
      );
      return {
        success: true as const,
        videos: (data.videos ?? []).map((v) => {
          const hd = v.video_files.find(
            (f) => f.quality === "hd" && f.file_type === "video/mp4",
          ) ?? v.video_files.find((f) => f.file_type === "video/mp4") ?? null;
          const sd = v.video_files
            .filter((f) => f.quality === "sd" && f.file_type === "video/mp4")
            .sort((a, b) => b.width - a.width)[0] ?? null;
          return {
            id: v.id,
            width: v.width,
            height: v.height,
            duration: v.duration,
            pexelsUrl: v.url,
            hdFile: hd ? { link: hd.link, width: hd.width, height: hd.height } : null,
            sdFile: sd ? { link: sd.link, width: sd.width, height: sd.height } : null,
          };
        }),
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
