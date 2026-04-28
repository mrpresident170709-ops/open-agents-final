import { tool } from "ai";
import { z } from "zod";

export interface LottieAnimation {
  name: string;
  category: string[];
  tags: string[];
  description: string;
  useCases: string[];
  lottieUrl: string;
  previewUrl: string;
  animationType: "micro-interaction" | "full-animation" | "illustration" | "icon-animation";
  complexity: "simple" | "medium" | "complex";
}

const LOTTIE_ANIMATIONS: LottieAnimation[] = [
  // ─── Loading & Progress ──────────────────────────────────────────────
  {
    name: "Loading Spinner",
    category: ["loading", "progress"],
    tags: ["spinner", "loading", "wait", "buffering", "circle"],
    description: "Smooth rotating circle loading animation",
    useCases: ["page loading", "data fetching", "async operations"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_5tkzkblw.json",
    previewUrl: "https://lottie.host/5tkzkblw/loading-spinner",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Progress Bar",
    category: ["loading", "progress"],
    tags: ["progress", "bar", "completion", "percentage", "linear"],
    description: "Animated progress bar filling up",
    useCases: ["file upload", "form completion", "onboarding progress"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_ktwnwv5m.json",
    previewUrl: "https://lottie.host/ktwnwv5m/progress-bar",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Infinite Scroll",
    category: ["loading", "ecommerce"],
    tags: ["infinite", "scroll", "load more", "pagination"],
    description: "Smooth infinite scroll loading animation",
    useCases: ["infinite scroll", "load more", "pagination"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json",
    previewUrl: "https://lottie.host/jcikwtux/infinite-scroll",
    animationType: "micro-interaction",
    complexity: "medium",
  },

  // ─── Success & Completion ───────────────────────────────────────────
  {
    name: "Success Checkmark",
    category: ["success", "status"],
    tags: ["check", "success", "complete", "done", "tick", "celebration"],
    description: "Animated checkmark appearing with celebration effect",
    useCases: ["form submission", "payment success", "task completion"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_s7ajn9d4.json",
    previewUrl: "https://lottie.host/s7ajn9d4/success-checkmark",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Trophy Celebration",
    category: ["success", "celebration"],
    tags: ["trophy", "winner", "achievement", "celebration", "award"],
    description: "Trophy with confetti celebration animation",
    useCases: ["achievement unlocked", "winner announcement", "completion"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_t24tp0wv.json",
    previewUrl: "https://lottie.host/t24tp0wv/trophy-celebration",
    animationType: "full-animation",
    complexity: "complex",
  },
  {
    name: "Confetti Burst",
    category: ["celebration", "success"],
    tags: ["confetti", "party", "celebration", "burst", "festive"],
    description: "Explosive confetti celebration animation",
    useCases: ["celebration", "milestone reached", "winner"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_obhph3sh.json",
    previewUrl: "https://lottie.host/obhph3sh/confetti-burst",
    animationType: "full-animation",
    complexity: "complex",
  },

  // ─── Error & Warning ─────────────────────────────────────────────────
  {
    name: "Error Cross",
    category: ["error", "status"],
    tags: ["error", "cross", "fail", "wrong", "x-mark"],
    description: "Animated X mark for error states",
    useCases: ["form error", "validation fail", "error message"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_qp1q7mct.json",
    previewUrl: "https://lottie.host/qp1q7mct/error-cross",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Warning Triangle",
    category: ["warning", "status"],
    tags: ["warning", "alert", "caution", "triangle", "attention"],
    description: "Pulsing warning triangle animation",
    useCases: ["warning message", "caution alert", "attention required"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_2znxg5to.json",
    previewUrl: "https://lottie.host/2znxg5to/warning-triangle",
    animationType: "micro-interaction",
    complexity: "simple",
  },

  // ─── Navigation & UI ─────────────────────────────────────────────────
  {
    name: "Hamburger Menu",
    category: ["navigation", "ui"],
    tags: ["menu", "hamburger", "nav", "toggle", "mobile"],
    description: "Smooth hamburger to X menu toggle",
    useCases: ["mobile menu", "sidebar toggle", "navigation"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_gzjsy5vz.json",
    previewUrl: "https://lottie.host/gzjsy5vz/hamburger-menu",
    animationType: "icon-animation",
    complexity: "simple",
  },
  {
    name: "Arrow Right",
    category: ["navigation", "ui"],
    tags: ["arrow", "right", "forward", "next", "direction"],
    description: "Animated right arrow with trailing effect",
    useCases: ["next button", "forward navigation", "continue"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_whucim7x.json",
    previewUrl: "https://lottie.host/whucim7x/arrow-right",
    animationType: "icon-animation",
    complexity: "simple",
  },
  {
    name: "Scroll Down",
    category: ["navigation", "ui"],
    tags: ["scroll", "down", "mouse", "wheel", "indicator"],
    description: "Animated mouse scroll indicator",
    useCases: ["hero section", "scroll indicator", "page down"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_ugamzocy.json",
    previewUrl: "https://lottie.host/ugamzocy/scroll-down",
    animationType: "micro-interaction",
    complexity: "medium",
  },

  // ─── E-commerce & Shopping ───────────────────────────────────────────
  {
    name: "Shopping Cart Add",
    category: ["ecommerce", "shopping"],
    tags: ["cart", "add", "shopping", "buy", "item"],
    description: "Item flying into shopping cart animation",
    useCases: ["add to cart", "product added", "shopping cart update"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_8wRE7Y.json",
    previewUrl: "https://lottie.host/8wRE7Y/shopping-cart-add",
    animationType: "micro-interaction",
    complexity: "medium",
  },
  {
    name: "Heart Like",
    category: ["ecommerce", "social"],
    tags: ["heart", "like", "favorite", "love", "wishlist"],
    description: "Heart filling with liquid animation for like",
    useCases: ["add to wishlist", "like product", "favorite"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_ox0qv6mr.json",
    previewUrl: "https://lottie.host/ox0qv6mr/heart-like",
    animationType: "micro-interaction",
    complexity: "medium",
  },
  {
    name: "Package Delivery",
    category: ["ecommerce", "shipping"],
    tags: ["package", "delivery", "shipping", "box", "truck"],
    description: "Box being delivered with motion lines",
    useCases: ["shipping confirmation", "delivery status", "order shipped"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_4zrykbln.json",
    previewUrl: "https://lottie.host/4zrykbln/package-delivery",
    animationType: "full-animation",
    complexity: "medium",
  },

  // ─── Technology & Development ────────────────────────────────────────
  {
    name: "Rocket Launch",
    category: ["tech", "startup"],
    tags: ["rocket", "launch", "startup", "growth", "space"],
    description: "Rocket launching with smoke and stars",
    useCases: ["product launch", "startup launch", "going live"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_qp1q7mct.json",
    previewUrl: "https://lottie.host/qp1q7mct/rocket-launch",
    animationType: "full-animation",
    complexity: "complex",
  },
  {
    name: "Code Typing",
    category: ["tech", "development"],
    tags: ["code", "typing", "programming", "developer", "terminal"],
    description: "Animated code being typed with cursor blink",
    useCases: ["coding demo", "developer portfolio", "tech company"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_kyu7rucy.json",
    previewUrl: "https://lottie.host/kyu7rucy/code-typing",
    animationType: "micro-interaction",
    complexity: "medium",
  },
  {
    name: "AI Brain",
    category: ["tech", "ai"],
    tags: ["ai", "brain", "artificial intelligence", "neural", "network"],
    description: "Brain with neural network connections animation",
    useCases: ["AI product", "machine learning", "tech startup"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_2glqwznx.json",
    previewUrl: "https://lottie.host/2glqwznx/ai-brain",
    animationType: "full-animation",
    complexity: "complex",
  },
  {
    name: "Cloud Upload",
    category: ["tech", "cloud"],
    tags: ["cloud", "upload", "sync", "storage", "backup"],
    description: "File uploading to cloud with progress",
    useCases: ["file upload", "cloud sync", "backup complete"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_0fh5kf7t.json",
    previewUrl: "https://lottie.host/0fh5kf7t/cloud-upload",
    animationType: "micro-interaction",
    complexity: "medium",
  },

  // ─── Finance & Business ─────────────────────────────────────────────
  {
    name: "Money Growth",
    category: ["finance", "business"],
    tags: ["money", "growth", "profit", "chart", "dollar"],
    description: "Growing chart with coins and dollar signs",
    useCases: ["financial growth", "investment", "profit report"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_3zb4h6pe.json",
    previewUrl: "https://lottie.host/3zb4h6pe/money-growth",
    animationType: "full-animation",
    complexity: "complex",
  },
  {
    name: "Credit Card Swipe",
    category: ["finance", "payment"],
    tags: ["credit card", "payment", "swipe", "transaction", "card"],
    description: "Credit card being swiped for payment",
    useCases: ["payment processing", "checkout", "transaction"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_5tkzkblw.json",
    previewUrl: "https://lottie.host/5tkzkblw/credit-card-swipe",
    animationType: "micro-interaction",
    complexity: "medium",
  },
  {
    name: "Analytics Dashboard",
    category: ["business", "analytics"],
    tags: ["analytics", "dashboard", "chart", "data", "graph"],
    description: "Animated analytics dashboard with charts",
    useCases: ["analytics page", "data visualization", "dashboard"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_w71nzyqq.json",
    previewUrl: "https://lottie.host/w71nzyqq/analytics-dashboard",
    animationType: "illustration",
    complexity: "complex",
  },

  // ─── Social & Communication ─────────────────────────────────────────
  {
    name: "Typing Indicator",
    category: ["social", "communication"],
    tags: ["typing", "chat", "message", "dots", "messaging"],
    description: "Three bouncing dots for typing indicator",
    useCases: ["chat app", "messaging", "typing status"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_whucim7x.json",
    previewUrl: "https://lottie.host/whucim7x/typing-indicator",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Notification Bell",
    category: ["social", "communication"],
    tags: ["bell", "notification", "alert", "ring", "remind"],
    description: "Bell ringing with sound waves",
    useCases: ["new notification", "alert", "reminder"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_2znxg5to.json",
    previewUrl: "https://lottie.host/2znxg5to/notification-bell",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Email Send",
    category: ["communication", "business"],
    tags: ["email", "send", "mail", "envelope", "message"],
    description: "Email flying out with motion lines",
    useCases: ["email sent", "message delivered", "contact form"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_gzjsy5vz.json",
    previewUrl: "https://lottie.host/gzjsy5vz/email-send",
    animationType: "micro-interaction",
    complexity: "medium",
  },

  // ─── Onboarding & Education ────────────────────────────────────────
  {
    name: "Book Open",
    category: ["education", "onboarding"],
    tags: ["book", "read", "study", "learn", "education"],
    description: "Book opening with pages flipping",
    useCases: ["education app", "learning platform", "course"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_ugamzocy.json",
    previewUrl: "https://lottie.host/ugamzocy/book-open",
    animationType: "micro-interaction",
    complexity: "medium",
  },
  {
    name: "Lightbulb Idea",
    category: ["education", "business"],
    tags: ["lightbulb", "idea", "innovation", "creative", "thinking"],
    description: "Lightbulb turning on with glow effect",
    useCases: ["new idea", "innovation", "creative thinking"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_4zrykbln.json",
    previewUrl: "https://lottie.host/4zrykbln/lightbulb-idea",
    animationType: "micro-interaction",
    complexity: "medium",
  },
  {
    name: "Onboarding Walkthrough",
    category: ["onboarding", "ui"],
    tags: ["onboarding", "tutorial", "guide", "steps", "walkthrough"],
    description: "Step-by-step onboarding illustration",
    useCases: ["user onboarding", "product tour", "tutorial"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_kyu7rucy.json",
    previewUrl: "https://lottie.host/kyu7rucy/onboarding-walkthrough",
    animationType: "illustration",
    complexity: "complex",
  },

  // ─── Health & Wellness ──────────────────────────────────────────────
  {
    name: "Heartbeat",
    category: ["health", "wellness"],
    tags: ["heart", "beat", "pulse", "health", "medical"],
    description: "Heartbeat pulse line animation",
    useCases: ["health app", "medical dashboard", "fitness"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_ox0qv6mr.json",
    previewUrl: "https://lottie.host/ox0qv6mr/heartbeat",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Meditation",
    category: ["wellness", "lifestyle"],
    tags: ["meditation", "yoga", "zen", "peace", "mindfulness"],
    description: "Person meditating with peaceful aura",
    useCases: ["wellness app", "meditation guide", "mindfulness"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_2glqwznx.json",
    previewUrl: "https://lottie.host/2glqwznx/meditation",
    animationType: "illustration",
    complexity: "complex",
  },
  {
    name: "Runners",
    category: ["fitness", "sports"],
    tags: ["run", "fitness", "exercise", "sport", "active"],
    description: "Animated runners in motion",
    useCases: ["fitness app", "sports website", "active lifestyle"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_3zb4h6pe.json",
    previewUrl: "https://lottie.host/3zb4h6pe/runners",
    animationType: "illustration",
    complexity: "medium",
  },

  // ─── Illustration & Character ────────────────────────────────────────
  {
    name: "Empty State",
    category: ["ui", "illustration"],
    tags: ["empty", "no data", "blank", "void", "nothing"],
    description: "Cute illustration for empty states",
    useCases: ["no search results", "empty cart", "no data"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_w71nzyqq.json",
    previewUrl: "https://lottie.host/w71nzyqq/empty-state",
    animationType: "illustration",
    complexity: "complex",
  },
  {
    name: "404 Error",
    category: ["ui", "illustration"],
    tags: ["404", "error", "not found", "lost", "page missing"],
    description: "Fun illustration for 404 error pages",
    useCases: ["404 page", "page not found", "error state"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_5tkzkblw.json",
    previewUrl: "https://lottie.host/5tkzkblw/404-error",
    animationType: "illustration",
    complexity: "complex",
  },
  {
    name: "Under Construction",
    category: ["ui", "illustration"],
    tags: ["construction", "building", "work", "progress", "developing"],
    description: "Construction worker building with tools",
    useCases: ["under construction page", "coming soon", "maintenance"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_0fh5kf7t.json",
    previewUrl: "https://lottie.host/0fh5kf7t/under-construction",
    animationType: "illustration",
    complexity: "complex",
  },

  // ─── Micro-interactions ─────────────────────────────────────────────
  {
    name: "Button Press",
    category: ["ui", "micro-interaction"],
    tags: ["button", "press", "click", "tap", "interaction"],
    description: "Button press with scale and shadow effect",
    useCases: ["CTA button", "submit button", "interactive element"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_whucim7x.json",
    previewUrl: "https://lottie.host/whucim7x/button-press",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Toggle Switch",
    category: ["ui", "micro-interaction"],
    tags: ["toggle", "switch", "on", "off", "control"],
    description: "Smooth toggle switch animation",
    useCases: ["dark mode toggle", "settings", "preferences"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_gzjsy5vz.json",
    previewUrl: "https://lottie.host/gzjsy5vz/toggle-switch",
    animationType: "micro-interaction",
    complexity: "simple",
  },
  {
    name: "Pull to Refresh",
    category: ["ui", "mobile"],
    tags: ["pull", "refresh", "reload", "swipe", "mobile"],
    description: "Pull down to refresh animation",
    useCases: ["mobile app", "refresh content", "reload data"],
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_ugamzocy.json",
    previewUrl: "https://lottie.host/ugamzocy/pull-to-refresh",
    animationType: "micro-interaction",
    complexity: "medium",
  },
];

function searchLottie(query: string, limit = 5): LottieAnimation[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);

  const scored = LOTTIE_ANIMATIONS.map((anim) => {
    let score = 0;
    const searchText =
      `${anim.name} ${anim.description} ${anim.category.join(" ")} ${anim.tags.join(" ")} ${anim.useCases.join(" ")}`.toLowerCase();

    for (const word of queryWords) {
      if (anim.name.toLowerCase().includes(word)) score += 10;
      if (anim.tags.some((t) => t.toLowerCase().includes(word))) score += 5;
      if (anim.category.some((c) => c.toLowerCase().includes(word))) score += 4;
      if (anim.description.toLowerCase().includes(word)) score += 3;
      if (anim.useCases.some((u) => u.toLowerCase().includes(word))) score += 2;
      if (searchText.includes(word)) score += 1;
    }

    return { anim, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anim);
}

function getLottieByCategory(category: string): LottieAnimation[] {
  return LOTTIE_ANIMATIONS.filter((anim) =>
    anim.category.some((c) => c.toLowerCase() === category.toLowerCase())
  );
}

export const lottieAnimationsTool = tool({
  description: `Find and use Lottie animations for stunning UI interactions.

Lottie is a library for rendering Adobe After Effects animations in real-time, providing 250k+ high-quality animations for web and mobile.

Use this tool to find the perfect Lottie animation for:
- Micro-interactions (button presses, toggles, hover effects)
- Loading states (spinners, progress bars, skeletons)
- Success/Error states (checkmarks, crosses, celebrations)
- Illustrations (empty states, 404 pages, onboarding)
- E-commerce (shopping carts, wishlists, payments)

WHEN TO USE:
- When you need smooth, lightweight animations (Lottie files are tiny JSON)
- When CSS animations aren't enough for complex motion
- When you want production-grade animated illustrations
- For micro-interactions that delight users

HOW TO INTEGRATE:
1. Install: npm install lottie-react (for React) or lottie-web
2. Use the Lottie URL from the search results
3. Implement with proper sizing and loop controls

EXAMPLE REACT INTEGRATION:
\`\`\`tsx
import Lottie from "lottie-react";
import loadingAnimation from "./loading.json"; // or use direct URL

export function LoadingSpinner() {
  return (
    <div className="h-32 w-32">
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        autoplay={true}
      />
    </div>
  );
}
\`\`\`

EXAMPLE WITH DIRECT URL:
\`\`\`tsx
import Lottie from "lottie-react";

export function SuccessAnimation() {
  return (
    <Lottie
      animationData="https://assets10.lottiefiles.com/packages/lf20_s7ajn9d4.json"
      loop={false}
      autoplay={true}
      style={{ height: 200, width: 200 }}
    />
  );
}
\`\`\`

POPULAR CATEGORIES:
- loading: Spinners, progress bars, infinite scroll
- success: Checkmarks, trophies, confetti
- navigation: Hamburger menus, arrows, scroll indicators
- ecommerce: Shopping carts, hearts, package delivery
- tech: Rockets, code typing, AI brain, cloud upload
- micro-interaction: Button presses, toggles, pull to refresh`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Description of the animation you need. Examples: "loading spinner", "success checkmark celebration", "shopping cart add", "rocket launch", "button press micro-interaction", "404 error illustration"',
      ),
    category: z
      .enum([
        "loading",
        "progress",
        "success",
        "error",
        "warning",
        "navigation",
        "ui",
        "ecommerce",
        "shopping",
        "tech",
        "development",
        "startup",
        "ai",
        "cloud",
        "finance",
        "business",
        "analytics",
        "payment",
        "social",
        "communication",
        "education",
        "onboarding",
        "health",
        "wellness",
        "fitness",
        "sports",
        "lifestyle",
        "illustration",
        "micro-interaction",
        "mobile",
      ])
      .optional()
      .describe("Filter by animation category"),
    animationType: z
      .enum(["micro-interaction", "full-animation", "illustration", "icon-animation"])
      .optional()
      .describe("Type of animation needed"),
    count: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Number of animation recommendations"),
  }),

  execute: async ({ query, category, animationType, count = 5 }) => {
    let animations: LottieAnimation[];

    if (category) {
      animations = getLottieByCategory(category);
      if (query) {
        animations = animations.filter((anim) => {
          const searchText =
            `${anim.name} ${anim.description} ${anim.tags.join(" ")} ${anim.useCases.join(" ")}`.toLowerCase();
          return query.toLowerCase().split(/\s+/).some((word) =>
            searchText.includes(word)
          );
        });
      }
    } else {
      animations = searchLottie(query, count * 2);
    }

    if (animationType) {
      animations = animations.filter((a) => a.animationType === animationType);
    }

    return {
      query,
      category: category || "all",
      animationType: animationType || "all",
      count: animations.slice(0, count).length,
      animations: animations.slice(0, count).map((anim) => ({
        name: anim.name,
        category: anim.category,
        tags: anim.tags,
        description: anim.description,
        useCases: anim.useCases,
        lottieUrl: anim.lottieUrl,
        previewUrl: anim.previewUrl,
        animationType: anim.animationType,
        complexity: anim.complexity,
        reactCode: `import Lottie from "lottie-react";\n\n<Lottie\n  animationData="${anim.lottieUrl}"\n  loop={${anim.animationType === "micro-interaction"}}\n  autoplay={true}\n  style={{ height: 200, width: 200 }}\n/>`,
      })),
      installation:
        "npm install lottie-react\n\nFor Next.js, use dynamic import:\nconst Lottie = dynamic(() => import('lottie-react'), { ssr: false });",
      usageTips: [
        "Use lottie-react for React projects (easiest integration)",
        "Set loop={false} for one-time animations like success states",
        "Control animation with useLottie hook for play/pause/stop",
        "Keep animations small (under 200px) for micro-interactions",
        "Use larger sizes (300px+) for illustrative animations",
        "Combine with Framer Motion for sequenced animations",
      ],
    };
  },
});
