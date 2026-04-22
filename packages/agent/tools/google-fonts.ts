import { tool } from "ai";
import { z } from "zod";

export interface FontEntry {
  name: string;
  category: "sans-serif" | "serif" | "display" | "monospace" | "handwriting";
  weights: number[];
  /** CSS @import URL for use in global stylesheets */
  cssImport: string;
  /** next/font/google import snippet */
  nextjsSnippet: string;
  /** CSS variable declaration snippet (e.g. for Tailwind) */
  cssVarSnippet: string;
  /** Tags that describe this font's personality and best use cases */
  tags: string[];
  /** Other font names it pairs well with */
  pairsWith: string[];
}

const WEIGHTS_COMMON = [300, 400, 500, 600, 700];
const WEIGHTS_DISPLAY = [400, 600, 700, 800, 900];
const WEIGHTS_THIN = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function cssImportUrl(family: string, weights: number[]): string {
  const encoded = family.replace(/ /g, "+");
  const wghtRange =
    weights.length > 2
      ? `0,${weights[0]}..${weights[weights.length - 1]};1,${weights[0]}..${weights[weights.length - 1]}`
      : weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@${wghtRange}&display=swap`;
}

function nextSnippet(
  family: string,
  weights: number[],
  variable: string,
): string {
  const importName = family.replace(/ /g, "_");
  return `import { ${importName} } from "next/font/google";

const ${variable.replace("--font-", "")} = ${importName}({
  subsets: ["latin"],
  weight: [${weights.map((w) => `"${w}"`).join(", ")}],
  variable: "${variable}",
  display: "swap",
});`;
}

function cssVar(family: string): string {
  return `--font-${family.toLowerCase().replace(/ /g, "-")}`;
}

const FONT_CATALOG: FontEntry[] = [
  // ─── SANS-SERIF ──────────────────────────────────────────────────────────
  {
    name: "Inter",
    category: "sans-serif",
    weights: WEIGHTS_COMMON,
    cssImport: cssImportUrl("Inter", WEIGHTS_COMMON),
    nextjsSnippet: nextSnippet("Inter", WEIGHTS_COMMON, cssVar("Inter")),
    cssVarSnippet: `font-family: var(${cssVar("Inter")}, Inter, sans-serif);`,
    tags: [
      "modern",
      "clean",
      "tech",
      "startup",
      "SaaS",
      "neutral",
      "professional",
      "readable",
    ],
    pairsWith: ["Playfair Display", "Merriweather", "JetBrains Mono"],
  },
  {
    name: "Geist",
    category: "sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    cssImport: cssImportUrl("Geist", [400, 500, 600, 700]),
    nextjsSnippet: nextSnippet("Geist", [400, 500, 600, 700], cssVar("Geist")),
    cssVarSnippet: `font-family: var(${cssVar("Geist")}, Geist, sans-serif);`,
    tags: [
      "developer",
      "tech",
      "minimal",
      "Vercel-style",
      "modern",
      "clean",
      "startup",
    ],
    pairsWith: ["Geist Mono", "Inter"],
  },
  {
    name: "Plus Jakarta Sans",
    category: "sans-serif",
    weights: WEIGHTS_COMMON,
    cssImport: cssImportUrl("Plus Jakarta Sans", WEIGHTS_COMMON),
    nextjsSnippet: nextSnippet(
      "Plus Jakarta Sans",
      WEIGHTS_COMMON,
      cssVar("Plus Jakarta Sans"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Plus Jakarta Sans")}, "Plus Jakarta Sans", sans-serif);`,
    tags: [
      "startup",
      "modern",
      "SaaS",
      "marketing",
      "friendly",
      "professional",
    ],
    pairsWith: ["Playfair Display", "Lora", "Inter"],
  },
  {
    name: "DM Sans",
    category: "sans-serif",
    weights: [300, 400, 500, 700],
    cssImport: cssImportUrl("DM Sans", [300, 400, 500, 700]),
    nextjsSnippet: nextSnippet(
      "DM Sans",
      [300, 400, 500, 700],
      cssVar("DM Sans"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("DM Sans")}, "DM Sans", sans-serif);`,
    tags: [
      "clean",
      "modern",
      "product",
      "app",
      "SaaS",
      "neutral",
      "versatile",
    ],
    pairsWith: ["DM Serif Display", "Playfair Display"],
  },
  {
    name: "Outfit",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    cssImport: cssImportUrl("Outfit", [300, 400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "Outfit",
      [300, 400, 500, 600, 700, 800],
      cssVar("Outfit"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Outfit")}, Outfit, sans-serif);`,
    tags: [
      "modern",
      "geometric",
      "startup",
      "tech",
      "bold",
      "energetic",
      "youthful",
    ],
    pairsWith: ["Inter", "Manrope"],
  },
  {
    name: "Manrope",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    cssImport: cssImportUrl("Manrope", [300, 400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "Manrope",
      [300, 400, 500, 600, 700, 800],
      cssVar("Manrope"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Manrope")}, Manrope, sans-serif);`,
    tags: [
      "modern",
      "humanist",
      "friendly",
      "professional",
      "versatile",
      "SaaS",
    ],
    pairsWith: ["Lora", "Merriweather", "Playfair Display"],
  },
  {
    name: "Space Grotesk",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700],
    cssImport: cssImportUrl("Space Grotesk", [300, 400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Space Grotesk",
      [300, 400, 500, 600, 700],
      cssVar("Space Grotesk"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Space Grotesk")}, "Space Grotesk", sans-serif);`,
    tags: [
      "tech",
      "developer",
      "crypto",
      "web3",
      "distinctive",
      "geometric",
      "futuristic",
    ],
    pairsWith: ["Space Mono", "Inter"],
  },
  {
    name: "Sora",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    cssImport: cssImportUrl("Sora", [300, 400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "Sora",
      [300, 400, 500, 600, 700, 800],
      cssVar("Sora"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Sora")}, Sora, sans-serif);`,
    tags: ["modern", "clean", "tech", "SaaS", "startup", "premium"],
    pairsWith: ["Inter", "Lora"],
  },
  {
    name: "Nunito",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    cssImport: cssImportUrl("Nunito", [300, 400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "Nunito",
      [300, 400, 500, 600, 700, 800],
      cssVar("Nunito"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Nunito")}, Nunito, sans-serif);`,
    tags: [
      "friendly",
      "rounded",
      "education",
      "children",
      "approachable",
      "app",
      "consumer",
    ],
    pairsWith: ["Lora", "Merriweather"],
  },
  {
    name: "Lexend",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700],
    cssImport: cssImportUrl("Lexend", [300, 400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Lexend",
      [300, 400, 500, 600, 700],
      cssVar("Lexend"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Lexend")}, Lexend, sans-serif);`,
    tags: [
      "readable",
      "accessible",
      "education",
      "health",
      "wellness",
      "modern",
    ],
    pairsWith: ["Merriweather", "Lora"],
  },
  {
    name: "Bricolage Grotesque",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    cssImport: cssImportUrl(
      "Bricolage Grotesque",
      [300, 400, 500, 600, 700, 800],
    ),
    nextjsSnippet: nextSnippet(
      "Bricolage Grotesque",
      [300, 400, 500, 600, 700, 800],
      cssVar("Bricolage Grotesque"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Bricolage Grotesque")}, "Bricolage Grotesque", sans-serif);`,
    tags: [
      "creative",
      "agency",
      "editorial",
      "bold",
      "distinctive",
      "design-forward",
    ],
    pairsWith: ["Playfair Display", "Lora"],
  },
  {
    name: "Figtree",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    cssImport: cssImportUrl("Figtree", [300, 400, 500, 600, 700, 800, 900]),
    nextjsSnippet: nextSnippet(
      "Figtree",
      [300, 400, 500, 600, 700, 800, 900],
      cssVar("Figtree"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Figtree")}, Figtree, sans-serif);`,
    tags: ["modern", "clean", "SaaS", "startup", "professional", "neutral"],
    pairsWith: ["Lora", "Merriweather"],
  },
  {
    name: "Poppins",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    cssImport: cssImportUrl("Poppins", [300, 400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "Poppins",
      [300, 400, 500, 600, 700, 800],
      cssVar("Poppins"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Poppins")}, Poppins, sans-serif);`,
    tags: [
      "geometric",
      "friendly",
      "versatile",
      "marketing",
      "app",
      "popular",
    ],
    pairsWith: ["Playfair Display", "Merriweather"],
  },
  {
    name: "Montserrat",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    cssImport: cssImportUrl(
      "Montserrat",
      [300, 400, 500, 600, 700, 800, 900],
    ),
    nextjsSnippet: nextSnippet(
      "Montserrat",
      [300, 400, 500, 600, 700, 800, 900],
      cssVar("Montserrat"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Montserrat")}, Montserrat, sans-serif);`,
    tags: [
      "bold",
      "impactful",
      "fashion",
      "luxury",
      "marketing",
      "heading",
      "strong",
    ],
    pairsWith: ["Merriweather", "Lora", "EB Garamond"],
  },
  {
    name: "Raleway",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    cssImport: cssImportUrl("Raleway", [300, 400, 500, 600, 700, 800, 900]),
    nextjsSnippet: nextSnippet(
      "Raleway",
      [300, 400, 500, 600, 700, 800, 900],
      cssVar("Raleway"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Raleway")}, Raleway, sans-serif);`,
    tags: [
      "elegant",
      "thin",
      "luxury",
      "fashion",
      "minimal",
      "high-end",
      "refined",
    ],
    pairsWith: ["Playfair Display", "Cormorant Garamond"],
  },

  // ─── SERIF ───────────────────────────────────────────────────────────────
  {
    name: "Playfair Display",
    category: "serif",
    weights: [400, 500, 600, 700, 800, 900],
    cssImport: cssImportUrl(
      "Playfair Display",
      [400, 500, 600, 700, 800, 900],
    ),
    nextjsSnippet: nextSnippet(
      "Playfair Display",
      [400, 500, 600, 700, 800, 900],
      cssVar("Playfair Display"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Playfair Display")}, "Playfair Display", serif);`,
    tags: [
      "luxury",
      "fashion",
      "editorial",
      "elegant",
      "high-end",
      "magazine",
      "heading",
    ],
    pairsWith: ["Inter", "DM Sans", "Manrope"],
  },
  {
    name: "Cormorant Garamond",
    category: "serif",
    weights: [300, 400, 500, 600, 700],
    cssImport: cssImportUrl("Cormorant Garamond", [300, 400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Cormorant Garamond",
      [300, 400, 500, 600, 700],
      cssVar("Cormorant Garamond"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Cormorant Garamond")}, "Cormorant Garamond", serif);`,
    tags: [
      "luxury",
      "fashion",
      "editorial",
      "ultra-elegant",
      "thin",
      "refined",
      "high-end",
    ],
    pairsWith: ["Raleway", "Montserrat", "Inter"],
  },
  {
    name: "Lora",
    category: "serif",
    weights: [400, 500, 600, 700],
    cssImport: cssImportUrl("Lora", [400, 500, 600, 700]),
    nextjsSnippet: nextSnippet("Lora", [400, 500, 600, 700], cssVar("Lora")),
    cssVarSnippet: `font-family: var(${cssVar("Lora")}, Lora, serif);`,
    tags: ["editorial", "blog", "readable", "literary", "warm", "balanced"],
    pairsWith: ["Plus Jakarta Sans", "DM Sans", "Manrope"],
  },
  {
    name: "Merriweather",
    category: "serif",
    weights: [300, 400, 700, 900],
    cssImport: cssImportUrl("Merriweather", [300, 400, 700, 900]),
    nextjsSnippet: nextSnippet(
      "Merriweather",
      [300, 400, 700, 900],
      cssVar("Merriweather"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Merriweather")}, Merriweather, serif);`,
    tags: [
      "editorial",
      "news",
      "blog",
      "readable",
      "trustworthy",
      "professional",
    ],
    pairsWith: ["Inter", "Montserrat", "Poppins"],
  },
  {
    name: "EB Garamond",
    category: "serif",
    weights: [400, 500, 600, 700, 800],
    cssImport: cssImportUrl("EB Garamond", [400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "EB Garamond",
      [400, 500, 600, 700, 800],
      cssVar("EB Garamond"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("EB Garamond")}, "EB Garamond", serif);`,
    tags: [
      "classic",
      "literary",
      "academic",
      "editorial",
      "timeless",
      "elegant",
    ],
    pairsWith: ["Montserrat", "Raleway", "Inter"],
  },
  {
    name: "DM Serif Display",
    category: "serif",
    weights: [400],
    cssImport: cssImportUrl("DM Serif Display", [400]),
    nextjsSnippet: nextSnippet(
      "DM Serif Display",
      [400],
      cssVar("DM Serif Display"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("DM Serif Display")}, "DM Serif Display", serif);`,
    tags: [
      "display",
      "heading",
      "editorial",
      "modern-serif",
      "contrast",
      "impactful",
    ],
    pairsWith: ["DM Sans", "Inter"],
  },
  {
    name: "Crimson Text",
    category: "serif",
    weights: [400, 600, 700],
    cssImport: cssImportUrl("Crimson Text", [400, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Crimson Text",
      [400, 600, 700],
      cssVar("Crimson Text"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Crimson Text")}, "Crimson Text", serif);`,
    tags: ["editorial", "literary", "academic", "classic", "warm", "humanist"],
    pairsWith: ["Raleway", "Montserrat"],
  },

  // ─── DISPLAY ─────────────────────────────────────────────────────────────
  {
    name: "Bebas Neue",
    category: "display",
    weights: [400],
    cssImport: `https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap`,
    nextjsSnippet: `import { Bebas_Neue } from "next/font/google";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "${cssVar("Bebas Neue")}",
  display: "swap",
});`,
    cssVarSnippet: `font-family: var(${cssVar("Bebas Neue")}, "Bebas Neue", sans-serif);`,
    tags: [
      "bold",
      "condensed",
      "sports",
      "fitness",
      "gaming",
      "impact",
      "headline",
      "uppercase",
    ],
    pairsWith: ["Inter", "Montserrat"],
  },
  {
    name: "Oswald",
    category: "display",
    weights: [300, 400, 500, 600, 700],
    cssImport: cssImportUrl("Oswald", [300, 400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Oswald",
      [300, 400, 500, 600, 700],
      cssVar("Oswald"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Oswald")}, Oswald, sans-serif);`,
    tags: [
      "bold",
      "condensed",
      "sports",
      "news",
      "impactful",
      "heading",
      "strong",
    ],
    pairsWith: ["Merriweather", "Lora"],
  },
  {
    name: "Anton",
    category: "display",
    weights: [400],
    cssImport: `https://fonts.googleapis.com/css2?family=Anton&display=swap`,
    nextjsSnippet: `import { Anton } from "next/font/google";

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "${cssVar("Anton")}",
  display: "swap",
});`,
    cssVarSnippet: `font-family: var(${cssVar("Anton")}, Anton, sans-serif);`,
    tags: [
      "bold",
      "impactful",
      "sports",
      "headline",
      "strong",
      "uppercase",
      "condensed",
    ],
    pairsWith: ["Inter", "Open Sans"],
  },
  {
    name: "Exo 2",
    category: "display",
    weights: WEIGHTS_THIN,
    cssImport: cssImportUrl("Exo 2", [300, 400, 500, 600, 700, 800, 900]),
    nextjsSnippet: nextSnippet(
      "Exo 2",
      [300, 400, 500, 600, 700, 800, 900],
      cssVar("Exo 2"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Exo 2")}, "Exo 2", sans-serif);`,
    tags: [
      "futuristic",
      "tech",
      "gaming",
      "sci-fi",
      "crypto",
      "web3",
      "AI",
      "bold",
    ],
    pairsWith: ["Space Grotesk", "Inter"],
  },
  {
    name: "Clash Display",
    category: "display",
    weights: [400, 500, 600, 700],
    cssImport: cssImportUrl("Plus Jakarta Sans", [400, 500, 600, 700]),
    nextjsSnippet: `// Clash Display is not on Google Fonts — use locally or via CDN.
// Fallback: Plus Jakarta Sans has a similar feel.
import { Plus_Jakarta_Sans } from "next/font/google";`,
    cssVarSnippet: `font-family: var(${cssVar("Clash Display")}, "Clash Display", sans-serif);`,
    tags: [
      "agency",
      "creative",
      "bold",
      "modern",
      "editorial",
      "design-forward",
    ],
    pairsWith: ["Inter", "DM Sans"],
  },

  // ─── MONOSPACE ───────────────────────────────────────────────────────────
  {
    name: "JetBrains Mono",
    category: "monospace",
    weights: [400, 500, 600, 700, 800],
    cssImport: cssImportUrl("JetBrains Mono", [400, 500, 600, 700, 800]),
    nextjsSnippet: nextSnippet(
      "JetBrains Mono",
      [400, 500, 600, 700, 800],
      cssVar("JetBrains Mono"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("JetBrains Mono")}, "JetBrains Mono", monospace);`,
    tags: [
      "developer",
      "code",
      "terminal",
      "tech",
      "IDE",
      "readable",
      "modern",
    ],
    pairsWith: ["Inter", "Geist"],
  },
  {
    name: "Fira Code",
    category: "monospace",
    weights: [300, 400, 500, 600, 700],
    cssImport: cssImportUrl("Fira Code", [300, 400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Fira Code",
      [300, 400, 500, 600, 700],
      cssVar("Fira Code"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Fira Code")}, "Fira Code", monospace);`,
    tags: ["developer", "code", "ligatures", "terminal", "tech"],
    pairsWith: ["Inter", "Manrope"],
  },
  {
    name: "Space Mono",
    category: "monospace",
    weights: [400, 700],
    cssImport: cssImportUrl("Space Mono", [400, 700]),
    nextjsSnippet: nextSnippet(
      "Space Mono",
      [400, 700],
      cssVar("Space Mono"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Space Mono")}, "Space Mono", monospace);`,
    tags: [
      "developer",
      "retro",
      "crypto",
      "web3",
      "futuristic",
      "distinctive",
    ],
    pairsWith: ["Space Grotesk", "Inter"],
  },
  {
    name: "IBM Plex Mono",
    category: "monospace",
    weights: [300, 400, 500, 600, 700],
    cssImport: cssImportUrl("IBM Plex Mono", [300, 400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "IBM Plex Mono",
      [300, 400, 500, 600, 700],
      cssVar("IBM Plex Mono"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("IBM Plex Mono")}, "IBM Plex Mono", monospace);`,
    tags: ["developer", "enterprise", "clean", "IBM", "corporate", "tech"],
    pairsWith: ["IBM Plex Sans", "Inter"],
  },
  {
    name: "Geist Mono",
    category: "monospace",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    cssImport: cssImportUrl("Geist Mono", [400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Geist Mono",
      [400, 500, 600, 700],
      cssVar("Geist Mono"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Geist Mono")}, "Geist Mono", monospace);`,
    tags: ["developer", "Vercel-style", "clean", "modern", "tech"],
    pairsWith: ["Geist", "Inter"],
  },

  // ─── HANDWRITING ─────────────────────────────────────────────────────────
  {
    name: "Pacifico",
    category: "handwriting",
    weights: [400],
    cssImport: `https://fonts.googleapis.com/css2?family=Pacifico&display=swap`,
    nextjsSnippet: `import { Pacifico } from "next/font/google";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "${cssVar("Pacifico")}",
  display: "swap",
});`,
    cssVarSnippet: `font-family: var(${cssVar("Pacifico")}, Pacifico, cursive);`,
    tags: [
      "fun",
      "casual",
      "food",
      "restaurant",
      "lifestyle",
      "retro",
      "friendly",
      "logo",
    ],
    pairsWith: ["Nunito", "Poppins"],
  },
  {
    name: "Dancing Script",
    category: "handwriting",
    weights: [400, 500, 600, 700],
    cssImport: cssImportUrl("Dancing Script", [400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Dancing Script",
      [400, 500, 600, 700],
      cssVar("Dancing Script"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Dancing Script")}, "Dancing Script", cursive);`,
    tags: [
      "elegant",
      "calligraphy",
      "wedding",
      "beauty",
      "lifestyle",
      "feminine",
    ],
    pairsWith: ["Lato", "Montserrat"],
  },
  {
    name: "Caveat",
    category: "handwriting",
    weights: [400, 500, 600, 700],
    cssImport: cssImportUrl("Caveat", [400, 500, 600, 700]),
    nextjsSnippet: nextSnippet(
      "Caveat",
      [400, 500, 600, 700],
      cssVar("Caveat"),
    ),
    cssVarSnippet: `font-family: var(${cssVar("Caveat")}, Caveat, cursive);`,
    tags: [
      "casual",
      "handwritten",
      "creative",
      "annotation",
      "informal",
      "personal",
    ],
    pairsWith: ["Inter", "DM Sans"],
  },
];

// ─── Selector logic ──────────────────────────────────────────────────────────

const SITE_TYPE_FONT_MAP: Record<string, string[]> = {
  saas: ["Inter", "Plus Jakarta Sans", "DM Sans", "Sora", "Figtree"],
  startup: [
    "Inter",
    "Outfit",
    "Manrope",
    "Plus Jakarta Sans",
    "Space Grotesk",
  ],
  tech: [
    "Geist",
    "Inter",
    "Space Grotesk",
    "DM Sans",
    "JetBrains Mono",
    "Exo 2",
  ],
  developer: [
    "Geist",
    "Inter",
    "Space Grotesk",
    "JetBrains Mono",
    "Fira Code",
    "Geist Mono",
  ],
  luxury: [
    "Cormorant Garamond",
    "Playfair Display",
    "Raleway",
    "Montserrat",
    "DM Serif Display",
  ],
  fashion: [
    "Cormorant Garamond",
    "Playfair Display",
    "Raleway",
    "Montserrat",
    "Oswald",
  ],
  agency: [
    "Bricolage Grotesque",
    "Manrope",
    "Space Grotesk",
    "Outfit",
    "DM Serif Display",
  ],
  creative: [
    "Bricolage Grotesque",
    "Sora",
    "Manrope",
    "Outfit",
    "Playfair Display",
  ],
  editorial: [
    "Playfair Display",
    "Lora",
    "Merriweather",
    "EB Garamond",
    "DM Serif Display",
  ],
  blog: ["Merriweather", "Lora", "Crimson Text", "Lexend", "DM Serif Display"],
  education: ["Lexend", "Nunito", "Manrope", "Lora", "Merriweather"],
  health: ["Lexend", "DM Sans", "Manrope", "Nunito", "Merriweather"],
  fitness: ["Bebas Neue", "Oswald", "Outfit", "Montserrat", "Anton"],
  sports: ["Bebas Neue", "Oswald", "Anton", "Montserrat", "Outfit"],
  gaming: ["Exo 2", "Space Grotesk", "Bebas Neue", "Outfit", "Oswald"],
  crypto: ["Space Grotesk", "Exo 2", "Space Mono", "Outfit", "Sora"],
  web3: ["Space Grotesk", "Exo 2", "Space Mono", "Sora", "Manrope"],
  restaurant: ["Pacifico", "Playfair Display", "Lora", "Oswald", "Nunito"],
  food: ["Pacifico", "Nunito", "Lora", "DM Sans", "Outfit"],
  wedding: ["Dancing Script", "Cormorant Garamond", "Raleway", "Lora"],
  beauty: ["Cormorant Garamond", "Raleway", "Dancing Script", "Playfair Display"],
  ecommerce: ["Inter", "DM Sans", "Poppins", "Manrope", "Outfit"],
  corporate: ["Inter", "Manrope", "DM Sans", "Merriweather", "IBM Plex Mono"],
  finance: [
    "Inter",
    "Manrope",
    "Merriweather",
    "DM Sans",
    "IBM Plex Mono",
  ],
};

function scoreFont(font: FontEntry, query: string): number {
  const lq = query.toLowerCase();
  let score = 0;
  for (const tag of font.tags) {
    if (lq.includes(tag.toLowerCase())) score += 3;
  }
  // Check site-type map
  for (const [type, names] of Object.entries(SITE_TYPE_FONT_MAP)) {
    if (lq.includes(type)) {
      if (names.includes(font.name)) score += 5;
    }
  }
  return score;
}

function selectFonts(query: string, count: number): FontEntry[] {
  // Score each font
  const scored = FONT_CATALOG.map((f) => ({
    font: f,
    score: scoreFont(f, query),
  }));

  // Sort by score descending, then stable fallback
  scored.sort((a, b) => b.score - a.score || 0);

  const picked = scored.slice(0, count).map((s) => s.font);

  // If we got fewer than requested (unlikely), pad with diverse defaults
  if (picked.length < count) {
    for (const f of FONT_CATALOG) {
      if (!picked.find((p) => p.name === f.name)) {
        picked.push(f);
        if (picked.length >= count) break;
      }
    }
  }

  return picked;
}

// ─── Tool definition ─────────────────────────────────────────────────────────

export const googleFontsTool = tool({
  description: `Look up Google Fonts that suit a specific type of website or design aesthetic.
Returns font recommendations with ready-to-use Next.js import snippets, CSS @import URLs, and CSS variable declarations.

WHEN TO USE:
- At the start of any new website or landing-page build to select appropriate typography
- When the user asks for a specific font style or aesthetic (e.g. "luxury", "tech", "playful")
- When cloning a competitor site — select fonts that match the competitor's visual tone

HOW TO APPLY THE RESULTS:
1. Pick 1–2 fonts from the recommendations (one for headings, one for body if pairing)
2. Add the font to the Next.js layout using the \`nextjsSnippet\` code
3. Pass the font variable to the root <html> or <body> className
4. Use the CSS variable in Tailwind classes: \`font-[family:var(--font-name)]\` or define it in tailwind.config

EXAMPLE TAILWIND v4 INTEGRATION:
\`\`\`css
/* In globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
:root { --font-body: 'Inter', sans-serif; }
body { font-family: var(--font-body); }
\`\`\`

EXAMPLE NEXT.JS INTEGRATION:
\`\`\`tsx
// layout.tsx
import { Inter, Playfair_Display } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading", weight: ["400","700"] });
export default function Layout({ children }) {
  return <html className={\`\${inter.variable} \${playfair.variable}\`}>{children}</html>;
}
\`\`\``,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Natural language description of the site type and desired aesthetic. Examples: "luxury fashion brand landing page", "dark SaaS developer tool", "playful education app for kids", "bold fitness gym website", "minimal corporate fintech"',
      ),
    count: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe(
        "Number of font recommendations to return. Default 5. Use 2–3 for a focused selection.",
      ),
    categories: z
      .array(
        z.enum([
          "sans-serif",
          "serif",
          "display",
          "monospace",
          "handwriting",
        ]),
      )
      .optional()
      .describe("Filter by font category. Omit to search all categories."),
  }),

  outputSchema: z.object({
    recommendations: z.array(
      z.object({
        name: z.string(),
        category: z.string(),
        weights: z.array(z.number()),
        cssImport: z.string(),
        nextjsSnippet: z.string(),
        cssVarSnippet: z.string(),
        tags: z.array(z.string()),
        pairsWith: z.array(z.string()),
      }),
    ),
    usageNote: z.string(),
  }),

  execute: async ({ query, count = 5, categories }) => {
    let catalog = FONT_CATALOG;
    if (categories && categories.length > 0) {
      catalog = catalog.filter((f) => categories.includes(f.category));
    }

    const overrideQuery = query;
    const fonts = selectFonts(overrideQuery, count);

    return {
      recommendations: fonts.map((f) => ({
        name: f.name,
        category: f.category,
        weights: f.weights,
        cssImport: f.cssImport,
        nextjsSnippet: f.nextjsSnippet,
        cssVarSnippet: f.cssVarSnippet,
        tags: f.tags,
        pairsWith: f.pairsWith,
      })),
      usageNote:
        "Pick 1 font for body copy and optionally 1 contrasting font for headings. " +
        "Use the nextjsSnippet in your layout.tsx and pass the .variable className to <html>. " +
        "For Tailwind v4, use @source and CSS variables in globals.css. " +
        "Google Fonts are loaded from Google's CDN — no API key required.",
    };
  },
});
