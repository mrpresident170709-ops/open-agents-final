/**
 * Frontend Secret Guard — static analysis engine
 *
 * Prevents secret environment variables from leaking into client-side bundles.
 * This runs synchronously inside writeFileTool and editFileTool BEFORE any file
 * is written to disk — giving the agent a hard, non-bypassable enforcement point.
 *
 * Rules:
 *  1. Detect whether the file will execute in a browser context (client file)
 *  2. Scan the file content for process.env.VAR / import.meta.env.VAR access
 *  3. Allow only publicly-safe prefixes (NEXT_PUBLIC_, VITE_, REACT_APP_, etc.)
 *  4. Block writing if any non-public secret is accessed from a client context
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SecretLeak {
  /** 1-based line number where the access was found */
  line: number;
  /** The env var name if statically determined, null for dynamic access */
  varName: string | null;
  /** The raw expression as it appears in source (e.g. `process.env.OPENAI_API_KEY`) */
  expression: string;
  /** True when the var name is computed at runtime (can't validate statically) */
  isDynamic: boolean;
}

export interface FrontendLeakReport {
  /** True when the file must be blocked from being written */
  blocked: boolean;
  /** True when static analysis classified this file as client-side */
  isClientFile: boolean;
  /** Human-readable reason for the client classification, or null if not client */
  clientFileReason: string | null;
  /** All detected leaks (only populated when isClientFile=true) */
  leaks: SecretLeak[];
  /**
   * Full error message to return to the agent.
   * null when no violation was found (blocked === false).
   */
  errorMessage: string | null;
}

// ─── Configuration ────────────────────────────────────────────────────────────

/** Variable name prefixes that are safe to bundle into the client. */
const SAFE_PUBLIC_PREFIXES = [
  "NEXT_PUBLIC_",
  "VITE_",
  "REACT_APP_",
  "PUBLIC_",       // SvelteKit
  "NUXT_PUBLIC_",
  "GATSBY_",
];

/** Specific variable names that are always safe (framework constants). */
const ALWAYS_SAFE_NAMES = new Set([
  "NODE_ENV",
  "NEXT_PHASE_PRODUCTION",
  "NEXT_PHASE_EXPORT",
  "npm_package_version",
  "npm_package_name",
  "VERCEL_ENV",
  "VERCEL_URL",
]);

/**
 * File path patterns that definitively indicate server-side execution.
 * Files matching these patterns are always skipped (no client bundle risk).
 */
const SERVER_FILE_PATTERNS: RegExp[] = [
  /\/api\//,                          // API routes (Next.js, Nuxt, SvelteKit, etc.)
  /\/server\//,                       // Explicit server directories
  /\.server\.(ts|tsx|js|jsx|mjs)$/,   // *.server.ts convention
  /\/lib\/server/,                    // lib/server utilities
  /\/utils\/server/,                  // utils/server utilities
  /\/helpers\/server/,
  /\/services\//,                     // Service layer (usually server-only)
  /\/middleware\.(ts|js|mjs)$/,       // Next.js / Express middleware
  /next\.config\.(ts|js|mjs)$/,
  /vite\.config\.(ts|js|mjs)$/,
  /svelte\.config\.(ts|js|mjs)$/,
  /nuxt\.config\.(ts|js|mjs)$/,
  /\/_worker\.(ts|js)$/,
  /\.action\.(ts|js|tsx|jsx)$/,       // Server actions (without use client)
  /\/actions\//,                      // Server actions directory
  /\/cron\//,                         // Cron jobs
  /\/jobs\//,                         // Background jobs
  /\/migrations\//,                   // Database migrations
  /\/scripts\//,                      // Build / seed scripts
  /\/seeds\//,
  /drizzle\.config\.(ts|js)$/,
  /prisma\/.*\.ts$/,
];

// ─── File classification ──────────────────────────────────────────────────────

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function isDefinitelyServerFile(filePath: string): boolean {
  const p = normalizePath(filePath);
  return SERVER_FILE_PATTERNS.some((re) => re.test(p));
}

interface ClientFileClassification {
  isClient: boolean;
  reason: string | null;
}

/**
 * Classify the file as client-side or server-side using the file path and content.
 * We use a layered approach: strongest signal wins.
 */
function classifyFile(
  filePath: string,
  content: string,
): ClientFileClassification {
  const p = normalizePath(filePath);

  // Server files are never at risk — skip all further checks
  if (isDefinitelyServerFile(filePath)) {
    return { isClient: false, reason: null };
  }

  // ── Signal 1: "use client" directive ──────────────────────────────────────
  // This is the definitive Next.js App Router / React marker.
  // It must appear in the first ~5 lines (before any imports).
  const firstLines = content.split("\n").slice(0, 6).join("\n");
  if (/^\s*["']use client["']\s*;?\s*$/m.test(firstLines)) {
    return { isClient: true, reason: '"use client" directive' };
  }

  // ── Signal 2: .jsx extension (always client-rendered) ─────────────────────
  if (/\.(jsx)$/.test(p)) {
    return { isClient: true, reason: ".jsx file (client-rendered in all frameworks)" };
  }

  // ── Signal 3: Pages Router files (not API routes) ─────────────────────────
  // pages/index.tsx, pages/about.tsx etc. run in the browser on client nav.
  // Match both "/pages/..." and "pages/..." (relative paths without leading slash).
  if (/(?:^|\/)pages\/(?!api\/)[^/].*\.(tsx?|jsx?)$/.test(p)) {
    return {
      isClient: true,
      reason: "Next.js Pages Router page (code runs client-side on navigation)",
    };
  }

  // ── Signal 4: React Native / Expo screens and components ─────────────────
  if (/\/(screens|views|app)\/.+\.(tsx|jsx)$/.test(p) && !/\/api\//.test(p)) {
    // React Native: screens/views are definitely client
    if (/react-native|expo/.test(content.slice(0, 500))) {
      return { isClient: true, reason: "React Native screen/view" };
    }
  }

  // ── Signal 5: Vite projects — any non-server .tsx/.jsx ───────────────────
  // Vite doesn't have server components; all .tsx/.jsx is client
  if (/import\.meta\.env/.test(content) && /\.(tsx|jsx)$/.test(p)) {
    return { isClient: true, reason: "Vite project file (all components are client-rendered)" };
  }

  // Not definitively classified as client
  return { isClient: false, reason: null };
}

// ─── Leak detection ───────────────────────────────────────────────────────────

/**
 * Strip single-line (`// ...`) and block (`/* ... *\/`) comments from content
 * to reduce false positives. Preserves line structure for accurate line numbers.
 */
function stripComments(content: string): string {
  // Replace single-line comments with blank of same length
  let result = content.replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
  // Replace block comments, preserving newlines
  result = result.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m
      .split("\n")
      .map((line, i) => (i === 0 ? " ".repeat(line.length) : ""))
      .join("\n"),
  );
  return result;
}

const PROCESS_ENV_STATIC =
  /process\.env\.([A-Z][A-Z0-9_]*)/g;
const PROCESS_ENV_BRACKET_STATIC =
  /process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g;
const PROCESS_ENV_DYNAMIC =
  /process\.env\[(?!["'])[^\]]+\]/g;
const IMPORT_META_ENV_STATIC =
  /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g;
const IMPORT_META_ENV_DYNAMIC =
  /import\.meta\.env\[(?!["'])[^\]]+\]/g;

function isPublicSafe(varName: string): boolean {
  if (ALWAYS_SAFE_NAMES.has(varName)) return true;
  return SAFE_PUBLIC_PREFIXES.some((prefix) => varName.startsWith(prefix));
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function scanLeaks(rawContent: string): SecretLeak[] {
  const content = stripComments(rawContent);
  const leaks: SecretLeak[] = [];

  const scan = (
    re: RegExp,
    handler: (match: RegExpExecArray) => SecretLeak | null,
  ) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const leak = handler(m);
      if (leak) leaks.push(leak);
    }
  };

  // process.env.VAR
  scan(PROCESS_ENV_STATIC, (m) => {
    const varName = m[1];
    if (isPublicSafe(varName)) return null;
    return {
      line: getLineNumber(content, m.index),
      varName,
      expression: m[0],
      isDynamic: false,
    };
  });

  // process.env["VAR"] / process.env['VAR']
  scan(PROCESS_ENV_BRACKET_STATIC, (m) => {
    const varName = m[1];
    if (isPublicSafe(varName)) return null;
    return {
      line: getLineNumber(content, m.index),
      varName,
      expression: m[0],
      isDynamic: false,
    };
  });

  // process.env[dynamicVar]
  scan(PROCESS_ENV_DYNAMIC, (m) => ({
    line: getLineNumber(content, m.index),
    varName: null,
    expression: m[0],
    isDynamic: true,
  }));

  // import.meta.env.VAR (Vite)
  scan(IMPORT_META_ENV_STATIC, (m) => {
    const varName = m[1];
    if (isPublicSafe(varName)) return null;
    return {
      line: getLineNumber(content, m.index),
      varName,
      expression: m[0],
      isDynamic: false,
    };
  });

  // import.meta.env[dynamicVar]
  scan(IMPORT_META_ENV_DYNAMIC, (m) => ({
    line: getLineNumber(content, m.index),
    varName: null,
    expression: m[0],
    isDynamic: true,
  }));

  // Deduplicate by (line, expression)
  const seen = new Set<string>();
  return leaks.filter((l) => {
    const key = `${l.line}::${l.expression}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Error message builder ────────────────────────────────────────────────────

function buildErrorMessage(
  filePath: string,
  clientReason: string,
  leaks: SecretLeak[],
): string {
  const displayPath = normalizePath(filePath).split("/").slice(-3).join("/");

  const leakLines = leaks
    .map((l) => {
      const dynamicNote = l.isDynamic
        ? " (dynamic access — cannot verify at runtime)"
        : "";
      const prefix = l.varName
        ? SAFE_PUBLIC_PREFIXES.find((p) => l.varName!.startsWith(p))
          ? ""
          : `  → consider NEXT_PUBLIC_${l.varName} if this is safe to expose`
        : "";
      return `  Line ${l.line}: ${l.expression}${dynamicNote}${prefix ? "\n" + prefix : ""}`;
    })
    .join("\n");

  const staticLeaks = leaks.filter((l) => !l.isDynamic && l.varName);
  const exampleVar = staticLeaks[0]?.varName ?? "SECRET_KEY";
  const apiRoutePath = filePath.includes("app/")
    ? "app/api/your-endpoint/route.ts"
    : "pages/api/your-endpoint.ts";
  const isNextPages = filePath.includes("pages/");
  const routeExample = isNextPages
    ? `// pages/api/your-endpoint.ts
export default async function handler(req, res) {
  const result = await callService(process.env.${exampleVar}); // ✓ server-only
  res.json({ result });
}`
    : `// ${apiRoutePath}
import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  const result = await callService(process.env.${exampleVar}); // ✓ server-only
  return NextResponse.json({ result });
}`;

  return `BLOCKED — Frontend secret leak detected in "${displayPath}"

Reason: ${clientReason}. Code in this file runs in the browser and gets bundled
into the JavaScript delivered to every user. Secrets accessed via process.env are
included verbatim in that bundle, exposing them to anyone who opens DevTools.

Leaked accesses:
${leakLines}

Fix: Move the logic that requires these secrets to a server-side API route,
then call that route from the component using fetch().

${routeExample}

// In your component — call the route, not the service directly:
const res = await fetch('/api/your-endpoint', { method: 'POST', body: JSON.stringify({ ... }) });
const { result } = await res.json();

If a variable is safe to expose (e.g. a public URL or publishable key), rename it
with the NEXT_PUBLIC_ prefix (Next.js) or VITE_ prefix (Vite) to acknowledge it.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse `content` (the full file being written to `filePath`) for frontend
 * secret leaks. Returns a {@link FrontendLeakReport} that callers use to
 * decide whether to block the write.
 *
 * This function is pure (no I/O, no side effects) so it can be called safely
 * inside any tool's execute() function.
 */
export function checkFrontendSecretLeak(
  filePath: string,
  content: string,
): FrontendLeakReport {
  const { isClient, reason: clientFileReason } = classifyFile(filePath, content);

  if (!isClient) {
    return {
      blocked: false,
      isClientFile: false,
      clientFileReason: null,
      leaks: [],
      errorMessage: null,
    };
  }

  const leaks = scanLeaks(content);

  if (leaks.length === 0) {
    return {
      blocked: false,
      isClientFile: true,
      clientFileReason,
      leaks: [],
      errorMessage: null,
    };
  }

  return {
    blocked: true,
    isClientFile: true,
    clientFileReason,
    leaks,
    errorMessage: buildErrorMessage(filePath, clientFileReason!, leaks),
  };
}
