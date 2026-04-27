import { tool } from "ai";
import { z } from "zod";
import { downloadUrlToSandbox } from "./binary-utils";
import { getSandbox, toDisplayPath } from "./utils";

const GRAPHQL_ENDPOINT = "https://graphql.lottiefiles.com/";
const REQUEST_TIMEOUT_MS = 30_000;

interface AnimationNode {
  id: number;
  name: string;
  lottieUrl: string;
  jsonUrl: string | null;
  imageUrl: string | null;
  bgColor: string | null;
  slug: string | null;
}

interface SearchResponse {
  data?: {
    searchPublicAnimations?: {
      edges: Array<{ node: AnimationNode }>;
      pageInfo: { hasNextPage: boolean };
    };
  };
  errors?: Array<{ message: string }>;
}

async function queryLottieFiles<T>(
  query: string,
  variables?: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  abortSignal?.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`LottieFiles GraphQL error (${res.status}): ${text.slice(0, 400)}`);
    }
    const json = JSON.parse(text) as { data?: T; errors?: Array<{ message: string }> };
    if (json.errors?.length) {
      throw new Error(`LottieFiles GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
    }
    return json.data as T;
  } finally {
    clearTimeout(timeout);
  }
}

const SEARCH_QUERY = `
  query SearchAnimations($query: String!, $first: Int) {
    searchPublicAnimations(query: $query, first: $first) {
      edges {
        node {
          id
          name
          lottieUrl
          jsonUrl
          imageUrl
          bgColor
          slug
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

export const lottieSearchTool = tool({
  description: `Search LottieFiles for micro-animations to use in the app. Returns ready-to-use animation URLs from a library of 250,000+ animations.

USE THIS TOOL for EVERY interactive element, state change, and visual indicator in the UI. Lottie is the DEFAULT for all UI feedback — not just loaders. The question is never "should I add a Lottie?" but "which Lottie fits here?".

## Where to use Lottie (comprehensive):

### Loading & Progress
- Page loading, button loading state, skeleton replacement
- Upload / download progress, processing spinner
- Search/filter in progress

### Success / Error / Warning States  
- Form submit success, field validation pass
- Error state, network failure, permission denied
- Warning message, caution notice

### Empty States
- Empty inbox, no search results, no notifications
- Empty cart, no data in chart, new user welcome

### Onboarding & Education
- Welcome animation, feature introduction
- Step completion checkmark, tutorial highlight
- Onboarding milestone, first-action celebration

### Micro-Interactions
- Like / heart fill, bookmark save, star rating
- Thumbs up/down, reaction emoji  
- Share / copy link, favourite toggle

### Feature Icons (animate on hover or viewport entry)
- Hero section icons, pricing plan icons
- Feature grid illustrations, service icons
- Dashboard widgets, metric cards

### Commerce & Payments
- Add to cart, wishlist add
- Checkout in progress, payment processing
- Payment success, order confirmed
- Refund / return initiated

### Notifications & Alerts
- Notification badge pulse, bell ring
- Toast/snackbar appear, alert flash
- New message indicator

### Auth & Security
- Login / signup animation
- Password strength indicator  
- 2FA / OTP verification
- Face/fingerprint scan, security check

### Data & Analytics
- Chart animating in, metric counting up
- Growth trend, ranking change
- Report generating

### Navigation
- Hamburger menu toggle
- Tab switch, accordion expand
- Drawer slide, page transition indicator

### Feedback Moments
- Form saved, settings updated
- Profile photo changed, account verified
- Subscription activated, trial started

## Usage pattern
1. Call this tool with a descriptive query (be specific — "success checkmark circle green" beats "success")
2. Pick the best result based on name and preview (imageUrl)
3. Download the JSON with \`lottie_download\` to save it into the project
4. Use it with lottie-react: \`<Lottie animationData={data} loop={false} />\`

## Tips for good search queries
- Be descriptive: "rocket launch startup" not "rocket"
- Include colour if important: "success checkmark green" 
- Include style if needed: "loading spinner minimal" or "loading spinner cute"
- For icons: "[subject] icon animation" e.g. "bell notification icon animation"
- For characters: "[mood] character" e.g. "happy robot character waving"`,
  inputSchema: z.object({
    query: z
      .string()
      .describe("What to search for — be specific. Examples: 'success checkmark celebration', 'loading spinner minimal', 'empty inbox no messages', 'payment success confetti'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of results to return. Default: 6"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      animations: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          jsonUrl: z.string().nullable(),
          lottieUrl: z.string(),
          previewImageUrl: z.string().nullable(),
          bgColor: z.string().nullable(),
          slug: z.string().nullable(),
        }),
      ),
      tip: z.string(),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async ({ query, limit = 6 }, { abortSignal }) => {
    try {
      const data = await queryLottieFiles<{
        searchPublicAnimations: {
          edges: Array<{ node: AnimationNode }>;
        };
      }>(SEARCH_QUERY, { query, first: limit }, abortSignal);

      const animations = (data.searchPublicAnimations?.edges ?? []).map(
        ({ node }) => ({
          id: node.id,
          name: node.name,
          jsonUrl: node.jsonUrl ?? null,
          lottieUrl: node.lottieUrl,
          previewImageUrl: node.imageUrl ?? null,
          bgColor: node.bgColor ?? null,
          slug: node.slug ?? null,
        }),
      );

      return {
        success: true as const,
        animations,
        tip: "Use jsonUrl with lottie-react (bun add lottie-react). Download to project with lottie_download tool.",
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const lottieDownloadTool = tool({
  description: `Download a Lottie animation JSON file from LottieFiles CDN into the project.

Call this immediately after lottie_search — pick the best result, then download it to a meaningful path.

ALWAYS save to: \`public/animations/<descriptive-name>.json\`
Examples:
  - public/animations/success-checkmark.json
  - public/animations/loading-spinner.json
  - public/animations/empty-inbox.json
  - public/animations/payment-success.json`,
  inputSchema: z.object({
    jsonUrl: z
      .string()
      .url()
      .describe("The jsonUrl from lottie_search result"),
    filePath: z
      .string()
      .describe("Where to save it, e.g. public/animations/success-checkmark.json"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      filePath: z.string(),
      bytes: z.number(),
      importPath: z.string(),
    }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]),
  execute: async ({ jsonUrl, filePath }, { experimental_context, abortSignal }) => {
    try {
      const sandbox = await getSandbox(experimental_context, "lottie_download");
      const bytes = await downloadUrlToSandbox(sandbox, jsonUrl, filePath, abortSignal);
      const displayPath = toDisplayPath(filePath, sandbox.workingDirectory);
      // Produce the import path the agent can use in code
      const importPath = filePath.startsWith("public/")
        ? "/" + filePath.slice("public/".length)
        : displayPath;
      return {
        success: true as const,
        filePath: displayPath,
        bytes,
        importPath,
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
