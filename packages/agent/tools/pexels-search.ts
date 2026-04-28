import { tool } from "ai";
import { z } from "zod";
import { getSandbox, toDisplayPath, shellEscape } from "./utils";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  avg_color: string;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

function getPexelsApiKey(): string | undefined {
  return process.env.PEXELS_API_KEY;
}

export const pexelsSearchTool = tool({
  description: `Search Pexels for high-quality, royalty-free stock photos.

Pexels provides access to 3+ million free stock photos and videos from creators worldwide.
Perfect for finding production-grade imagery for websites, landing pages, and UI designs.

WHEN TO USE:
- When building landing pages that need hero images or background photos
- When you need high-quality visuals for sections (features, testimonials, CTA)
- When creating mockups that need realistic imagery
- When the user asks for specific image types (nature, tech, business, etc.)

HOW TO USE THE RESULTS:
1. Choose the appropriate size (large for hero, medium for cards, small for thumbnails)
2. Download the image or use the URL directly
3. Optimize with Next.js Image component for best performance

EXAMPLE USAGE:
\`\`\`tsx
import Image from "next/image";

// Using downloaded image
<Image
  src="/images/hero-bg.jpg"
  alt="Modern office workspace"
  width={1920}
  height={1080}
  priority
/>

// Or use URL directly (less optimal)
<img
  src="https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg"
  alt="Modern office workspace"
/>
\`\`\`

BEST PRACTICES:
- Always use Next.js Image component for automatic optimization
- Choose images with relevant avg_color for your color scheme
- Download images to public/ folder for better performance
- Use appropriate sizes: hero (1920x1080), card (800x600), thumbnail (400x300)

POPULAR SEARCHES:
- "modern office workspace" - For SaaS/tech landing pages
- "diverse team meeting" - For about/team pages
- "abstract gradient background" - For hero backgrounds
- "mobile app mockup" - For app showcases
- "happy customer" - For testimonials
- "futuristic technology" - For AI/tech companies`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Search query for stock photos. Be descriptive: "modern minimalist office workspace natural light", "diverse team collaborating startup environment", "abstract blue gradient background tech"',
      ),
    count: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Number of photos to return"),
    size: z
      .enum(["large2x", "large", "medium", "small", "portrait", "landscape", "tiny"])
      .default("large")
      .describe("Image size to return. large=1920x1280, medium=1280x853, small=640x426"),
    color: z
      .string()
      .optional()
      .describe(
        'Filter by dominant color: "red", "blue", "green", "yellow", "orange", "purple", "pink", "white", "gray", "black"',
      ),
    orientation: z
      .enum(["landscape", "portrait", "square"])
      .optional()
      .describe("Filter by orientation. landscape=horizontal, portrait=vertical"),
    downloadToProject: z
      .boolean()
      .default(false)
      .describe(
        "Download images to project's public/images folder for better performance",
      ),
  }),

  execute: async ({
    query,
    count = 5,
    size = "large",
    color,
    orientation,
    downloadToProject = false,
  }) => {
    const apiKey = getPexelsApiKey();

    if (!apiKey) {
      return {
        success: false,
        error: "PEXELS_API_KEY environment variable is not set",
        setup:
          "Get a free API key from https://www.pexels.com/api/ and add to your .env file:\nPEXELS_API_KEY=your_api_key_here",
        alternatives: [
          "Use generateImage tool to create custom AI images",
          "Use Lottie animations for illustrations instead of photos",
          "Search Unsplash or other free stock photo sites",
        ],
      };
    }

    try {
      const params = new URLSearchParams({
        query,
        per_page: count.toString(),
      });
      if (color) params.append("color", color);
      if (orientation) params.append("orientation", orientation);

      const response = await fetch(
        `https://api.pexels.com/v1/search?${params.toString()}`,
        {
          headers: {
            Authorization: apiKey,
          },
        },
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Pexels API error: ${response.status} ${response.statusText}`,
        };
      }

      const data: PexelsSearchResponse = await response.json() as PexelsSearchResponse;

      if (data.photos.length === 0) {
        return {
          success: true,
          totalResults: 0,
          query,
          message: "No photos found. Try a different search query.",
          suggestions: [
            "Use broader terms (e.g., 'office' instead of 'modern glass office building')",
            "Try synonyms (e.g., 'workspace' instead of 'office')",
            "Remove color/orientation filters",
          ],
        };
      }

      const photos = data.photos.map((photo) => ({
        id: photo.id,
        width: photo.width,
        height: photo.height,
        url: photo.url,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        imageUrl: photo.src[size],
        allSizes: {
          original: photo.src.original,
          large2x: photo.src.large2x,
          large: photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small,
          portrait: photo.src.portrait,
          landscape: photo.src.landscape,
          tiny: photo.src.tiny,
        },
        alt: photo.alt || query,
        avgColor: photo.avg_color,
        nextJsCode: `<Image\n  src="${photo.src.medium}"\n  alt="${photo.alt || query}"\n  width={${photo.width}}\n  height={${photo.height}}\n  className="object-cover"\n/>`,
        downloadCommand: `curl -o public/images/pexels-${photo.id}.jpg "${photo.src.large}"`,
      }));

      let downloadResults = [];
      if (downloadToProject) {
        const sandbox = await getSandbox({} as any, "pexels");
        const mkdirResult = await sandbox.exec(
          "mkdir -p public/images",
          sandbox.workingDirectory || ".",
          5000,
        );

        for (const photo of photos) {
          const filename = `public/images/pexels-${photo.id}.jpg`;
          const downloadResult = await sandbox.exec(
            `curl -s -o "${filename}" "${photo.imageUrl}"`,
            sandbox.workingDirectory || ".",
            10000,
          );

          downloadResults.push({
            id: photo.id,
            filename,
            success: downloadResult.exitCode === 0,
            error: downloadResult.exitCode !== 0 ? downloadResult.stderr : undefined,
          });
        }
      }

      return {
        success: true,
        query,
        totalResults: data.total_results,
        count: photos.length,
        photos,
        downloaded: downloadToProject ? downloadResults : undefined,
        usage: {
          nextJs: `import Image from "next/image";

// Optimized with Next.js Image
<Image
  src="/images/pexels-${photos[0]?.id}.jpg"
  alt="${photos[0]?.alt || query}"
  width={1920}
  height={1080}
  priority
  className="object-cover"
/>`,
          html: `<img
  src="${photos[0]?.imageUrl}"
  alt="${photos[0]?.alt || query}"
  width="${photos[0]?.width}"
  height="${photos[0]?.height}"
/>`,
        },
        attribution:
          "Photos from Pexels. Photographers: " +
          photos.map((p) => p.photographer).join(", "),
        tip: "For best performance, download images to public/ folder and use Next.js Image component with appropriate sizes.",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
