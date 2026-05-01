import { tool } from "ai";
import { z } from "zod";

export const landingPageGeneratorTool = tool({
  description: `GENERATE WORLD-CLASS LANDING PAGE BY CLONING TOP COMPETITOR

This is the ULTIMATE landing page creation workflow. Use this when user wants to build a landing page.

PROCESS (FOLLOW EXACTLY):
1. DETECT CATEGORY: Determine what type of landing page (SaaS, startup, portfolio, app, etc.)
2. SEARCH COMPETITORS: Use firecrawl_search to find top 5 competitors in that category
3. CHOOSE WINNER: Select the most popular/polished one
4. SCRAPE COMPETITOR: Use firecrawl_scrape with includeHtml:true to get full structure
5. EXTRACT ASSETS: Get fonts, colors, images, icons from scraped HTML
6. FIND IMAGES: Use pexels_search for high-quality replacement images
7. FIND ICONS: Use lucide_icons for matching icon set
8. FIND ANIMATIONS: Use lottie_animations for micro-interactions
9. BUILD EXACT REPLICA: Use all extracted data + world-class UI tools to build

OUTPUT: An exact replica or inspired version of the competitor's landing page that's even better.

USE FOR: "Build a landing page", "Create a SaaS homepage", "Make a startup website", etc.`,
  inputSchema: z.object({
    projectType: z.string().describe("Type of landing page: SaaS, startup, portfolio, app, e-commerce, etc."),
    description: z.string().describe("What the product/service does"),
    targetAudience: z.string().optional().describe("Who the landing page is for"),
    keyFeatures: z.array(z.string()).optional().describe("Features to highlight"),
    style: z.enum(["modern", "minimal", "bold", "dark", "playful", "luxury"]).optional().describe("Preferred style"),
  }),
  outputSchema: z.object({
    competitorFound: z.boolean(),
    competitorUrl: z.string().optional(),
    competitorData: z.string().optional(),
    images: z.array(z.string()).optional(),
    fonts: z.array(z.string()).optional(),
    status: z.string(),
  }),
  execute: async ({ projectType, description, targetAudience, keyFeatures, style }, { abortSignal }) => {
    const searchQueries = [
      `best ${projectType} landing pages 2025`,
      `top ${projectType} startup websites`,
      `beautiful ${projectType} homepage examples`,
    ];
    
    const searchResult = {
      competitorFound: true,
      competitorUrl: "https://example-top-competitor.com",
      competitorData: "Use firecrawl_scrape to extract full competitor structure, then build inspired landing page using the premium UI formula",
      images: ["Search pexels for relevant high-quality images"],
      fonts: ["Use get_google_fonts for distinctive font pairing"],
      status: "ready_to_clone",
    };
    
    return searchResult;
  },
});

export const detectLandingPageIntentTool = tool({
  description: `Detect if user wants a landing page and extract key information.

Returns: isLandingPage (boolean), projectType, description, audience, features, style`,
  inputSchema: z.object({
    userMessage: z.string().describe("The user's message/prompt"),
  }),
  outputSchema: z.object({
    isLandingPage: z.boolean(),
    projectType: z.string().optional(),
    description: z.string().optional(),
    targetAudience: z.string().optional(),
    keyFeatures: z.array(z.string()).optional(),
    preferredStyle: z.string().optional(),
  }),
  execute: async ({ userMessage }, { abortSignal }) => {
    const lowerMessage = userMessage.toLowerCase();
    
    const landingPageKeywords = [
      "landing page", "landing pages", "homepage", "home page",
      "build a website", "create website", "make a website",
      "saas website", "startup website", "product page",
      "hero section", "marketing page", "promotional page",
      "launch page", "coming soon page", "waitlist page",
      "portfolio website", "business website", "company website",
    ];
    
    const projectTypes: Record<string, string> = {
      "saas": "SaaS", "software": "SaaS", "app": "App", "application": "App",
      "startup": "Startup", "new business": "Startup",
      "portfolio": "Portfolio", "personal": "Portfolio",
      "ecommerce": "E-commerce", "shop": "E-commerce", "store": "E-commerce",
      "course": "Course", "learning": "Course", "education": "Course",
      "fintech": "FinTech", "finance": "FinTech", "banking": "FinTech",
      "healthcare": "Healthcare", "health": "Healthcare", "medical": "Healthcare",
    };
    
    const styles: Record<string, string> = {
      "minimal": "minimal", "clean": "minimal", "simple": "minimal",
      "dark": "dark", "dark mode": "dark", "night": "dark",
      "bold": "bold", "modern": "modern", "contemporary": "modern",
      "playful": "playful", "fun": "playful", "colorful": "playful",
      "luxury": "luxury", "premium": "luxury", "elegant": "luxury",
    };
    
    const isLandingPage = landingPageKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (!isLandingPage) {
      return {
        isLandingPage: false,
      };
    }
    
    let detectedType = "General";
    for (const [key, value] of Object.entries(projectTypes)) {
      if (lowerMessage.includes(key)) {
        detectedType = value;
        break;
      }
    }
    
    let detectedStyle = "modern";
    for (const [key, value] of Object.entries(styles)) {
      if (lowerMessage.includes(key)) {
        detectedStyle = value;
        break;
      }
    }
    
    return {
      isLandingPage: true,
      projectType: detectedType,
      description: userMessage,
      targetAudience: undefined,
      keyFeatures: undefined,
      preferredStyle: detectedStyle,
    };
  },
});