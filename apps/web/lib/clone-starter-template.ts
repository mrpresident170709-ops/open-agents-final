import "server-only";

/**
 * Minimal, known-good Next.js + Tailwind v3 + shadcn baseline.
 *
 * Seeded into a fresh sandbox before the first cloning turn. The agent only
 * has to write section components, routes, and assets — it never has to
 * reinvent package.json / postcss / tailwind config (which is where every
 * empty-CSS failure has come from).
 *
 * Tailwind v3 is intentional: v4 has new PostCSS plugin shape that LLMs
 * regularly mis-configure. v3 is boring and works.
 */

interface StarterFile {
  path: string;
  content: string;
}

const PACKAGE_JSON = `{
  "name": "site-clone",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000 -H 0.0.0.0",
    "build": "next build",
    "start": "next start -p 3000 -H 0.0.0.0",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.18",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.460.0",
    "framer-motion": "^11.11.17"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20"
  },
  "packageManager": "pnpm@9.12.3"
}
`;

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

const TAILWIND_CONFIG = `import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
`;

const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@layer base {
  * { @apply border-border; }
  html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  body { @apply bg-background text-foreground font-sans; }
}
`;

const LAYOUT_TSX = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '{{BRAND}}',
  description: 'Replace this metadata once the brand and competitor are confirmed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
`;

const PAGE_TSX = `export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Starter scaffold</p>
        <h1 className="text-4xl font-semibold">Waiting for the agent.</h1>
        <p className="text-muted-foreground">
          Once the agent finishes scraping the chosen competitor, this page will be replaced
          section-by-section with the cloned layout.
        </p>
      </div>
    </main>
  );
}
`;

const LIB_UTILS = `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const GITIGNORE = `node_modules
.next
out
.env*.local
*.tsbuildinfo
next-env.d.ts
`;

const README_MD = `# Clone scaffold

This sandbox was seeded with a Next.js 15 + Tailwind v3 + shadcn baseline.

You (the agent) MUST treat this as the starting point. Do NOT recreate
\`package.json\`, \`tailwind.config.ts\`, \`postcss.config.mjs\`,
\`app/layout.tsx\`, or \`app/globals.css\` from scratch — extend them.

To add a section: create \`components/sections/<Name>.tsx\` and import it into
the relevant route under \`app/\`.

To add a page route: \`app/<slug>/page.tsx\`.

To add a font: edit \`app/layout.tsx\` and add \`next/font/google\` (or local).
The font CSS variable name MUST be \`--font-sans\` and/or \`--font-display\`
so the existing Tailwind config picks it up.

The first dev-server start should be \`pnpm install && pnpm dev\`.

## Package manager

This sandbox uses **pnpm**. \`npm install\` and \`bun install\` will fail
(npm chokes on peer deps of some libs and bun is not installed). Always
run \`pnpm install\`, \`pnpm add <pkg>\`, \`pnpm dev\`, \`pnpm build\`.

`;

const STARTER_FILES: StarterFile[] = [
  { path: "package.json", content: PACKAGE_JSON },
  { path: "next.config.mjs", content: NEXT_CONFIG },
  { path: "tsconfig.json", content: TSCONFIG },
  { path: "tailwind.config.ts", content: TAILWIND_CONFIG },
  { path: "postcss.config.mjs", content: POSTCSS_CONFIG },
  { path: "app/globals.css", content: GLOBALS_CSS },
  { path: "app/layout.tsx", content: LAYOUT_TSX },
  { path: "app/page.tsx", content: PAGE_TSX },
  { path: "lib/utils.ts", content: LIB_UTILS },
  { path: ".gitignore", content: GITIGNORE },
  { path: "README.md", content: README_MD },
];

export const CLONE_STARTER_MARKER = ".clone-starter-seeded";

interface MinimalSandbox {
  workingDirectory: string;
  readFile(path: string, encoding: "utf-8"): Promise<string>;
  writeFile(path: string, content: string, encoding: "utf-8"): Promise<void>;
}

/**
 * Seed the starter scaffold into the sandbox iff it has not already been
 * seeded. Idempotent and safe to call from the chat route on every first
 * user message.
 */
export async function seedCloneStarterIfNeeded(
  sandbox: MinimalSandbox,
): Promise<{ seeded: boolean; reason: string }> {
  const wd = sandbox.workingDirectory.replace(/\/$/, "");
  const markerPath = `${wd}/${CLONE_STARTER_MARKER}`;

  try {
    await sandbox.readFile(markerPath, "utf-8");
    return { seeded: false, reason: "already-seeded" };
  } catch {
    // marker absent → proceed
  }

  // If a real package.json is already present (user-imported repo, or a
  // previous turn already started writing files), do not clobber.
  try {
    const existing = await sandbox.readFile(`${wd}/package.json`, "utf-8");
    if (existing && existing.trim().length > 0) {
      // Mark as seeded so we don't keep checking on every turn.
      await sandbox.writeFile(
        markerPath,
        `skipped: package.json already exists\n`,
        "utf-8",
      );
      return { seeded: false, reason: "package-json-exists" };
    }
  } catch {
    // no package.json → proceed
  }

  await Promise.all(
    STARTER_FILES.map((f) =>
      sandbox.writeFile(`${wd}/${f.path}`, f.content, "utf-8"),
    ),
  );

  await sandbox.writeFile(
    markerPath,
    `seeded at ${new Date().toISOString()}\n`,
    "utf-8",
  );

  return { seeded: true, reason: "fresh-sandbox" };
}
