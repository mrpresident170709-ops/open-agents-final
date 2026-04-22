import "server-only";

import type { Sandbox } from "@open-harness/sandbox";

// Directories that are never source code
const SKIP_DIRS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".pnpm-store",
  ".yarn",
];

// File extensions that may contain env var references
const SOURCE_EXTENSIONS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "sh",
  "env",
  "env.example",
];

// Matches env var access patterns across common runtimes/frameworks.
// Group 1 always captures the variable name.
const ENV_PATTERNS = [
  /process\.env\.([A-Z_][A-Z0-9_]+)/g, // Node.js / Bun / Deno process
  /Bun\.env\.([A-Z_][A-Z0-9_]+)/g, // Bun-native
  /import\.meta\.env\.([A-Z_][A-Z0-9_]+)/g, // Vite / Astro
  /os\.environ\[['"]([A-Z_][A-Z0-9_]+)['"]\]/g, // Python dict-style
  /os\.getenv\(['"]([A-Z_][A-Z0-9_]+)['"]\)/g, // Python getenv
  /ENV\[['"]([A-Z_][A-Z0-9_]+)['"]\]/g, // Ruby
  /Deno\.env\.get\(['"]([A-Z_][A-Z0-9_]+)['"]\)/g, // Deno
  /std::env::var\(['"]([A-Z_][A-Z0-9_]+)['"]\)/g, // Rust
  /os\.Getenv\(['"]([A-Z_][A-Z0-9_]+)['"]\)/g, // Go
];

// System / framework vars that are never user secrets
const SYSTEM_VAR_PREFIXES = [
  "NODE_",
  "NPM_",
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "TERM",
  "LANG",
  "LC_",
  "PWD",
  "OLDPWD",
  "TMPDIR",
  "TEMP",
  "TMP",
  "NEXT_",
  "VITE_",
  "CRA_",
  "REACT_APP_",
];

function isSystemVar(name: string): boolean {
  return SYSTEM_VAR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Extract all env var names referenced in a chunk of source text.
 */
function extractFromText(text: string): Set<string> {
  const found = new Set<string>();
  for (const pattern of ENV_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (name && name.length >= 2 && !isSystemVar(name)) {
        found.add(name);
      }
    }
  }
  return found;
}

const ANALYSIS_TIMEOUT_MS = 15_000;

/**
 * Scan the sandbox workspace for env var references using grep.
 * Falls back to a JS-based walk if grep is unavailable.
 *
 * Returns the set of env var names that are actually referenced in source code.
 * Only names present in `availableNames` are returned (the intersection).
 *
 * If analysis fails or times out, returns null so the caller can fall back to
 * injecting all secrets.
 */
export async function analyzeEnvVarUsage(
  sandbox: Sandbox,
  availableNames: string[],
): Promise<Set<string> | null> {
  if (availableNames.length === 0) return new Set();

  try {
    // Build grep include flags
    const includeFlags = SOURCE_EXTENSIONS.map((ext) => `--include="*.${ext}"`).join(" ");
    const excludeDirFlags = SKIP_DIRS.map((d) => `--exclude-dir="${d}"`).join(" ");

    // Single grep that matches all env patterns; -h suppresses filenames, -o prints only matches
    // We search for the full access expression and later parse out the var name.
    const grepPattern = [
      "process[.]env[.][A-Z_][A-Z0-9_]+",
      "Bun[.]env[.][A-Z_][A-Z0-9_]+",
      "import[.]meta[.]env[.][A-Z_][A-Z0-9_]+",
      "os[.]environ\\[.[A-Z_][A-Z0-9_]+",
      "os[.]getenv\\(.[A-Z_][A-Z0-9_]+",
      "ENV\\[.[A-Z_][A-Z0-9_]+",
      "Deno[.]env[.]get\\(.[A-Z_][A-Z0-9_]+",
      "os[.]Getenv\\(.[A-Z_][A-Z0-9_]+",
    ].join("|");

    const cmd = [
      "grep",
      "-rh",
      "-E",
      `'${grepPattern}'`,
      includeFlags,
      excludeDirFlags,
      ".",
      "2>/dev/null",
      "|| true",
    ].join(" ");

    const result = await sandbox.exec(cmd, sandbox.workingDirectory, ANALYSIS_TIMEOUT_MS);

    const output = result.success ? result.stdout : (result.stdout + result.stderr);
    if (!output.trim()) {
      // No matches — workspace may be empty or have no source files yet
      return null;
    }

    const found = extractFromText(output);
    const available = new Set(availableNames);
    const intersection = new Set([...found].filter((name) => available.has(name)));

    return intersection;
  } catch (err) {
    console.warn("[analyze-env-usage] analysis failed, will inject all secrets:", err);
    return null;
  }
}

/**
 * Filter a secrets map to only include keys that appear in `referenced`.
 * If `referenced` is null (analysis failed), returns the original map unchanged.
 * If `referenced` is empty (no code yet), returns an empty map — nothing to inject.
 */
export function filterSecretsByUsage(
  allSecrets: Record<string, string>,
  referenced: Set<string> | null,
): { filtered: Record<string, string>; reason: string } {
  const total = Object.keys(allSecrets).length;

  if (referenced === null) {
    // Analysis failed — safe fallback: inject everything
    return {
      filtered: allSecrets,
      reason: `analysis failed, injecting all ${total} secret(s)`,
    };
  }

  if (referenced.size === 0 && total > 0) {
    // No references found in code yet — inject nothing (empty workspace or no usages)
    return {
      filtered: {},
      reason: `no env var references found in workspace, skipping injection`,
    };
  }

  const filtered: Record<string, string> = {};
  for (const name of referenced) {
    if (name in allSecrets) {
      filtered[name] = allSecrets[name];
    }
  }

  const skipped = total - Object.keys(filtered).length;
  const reason = skipped > 0
    ? `injecting ${Object.keys(filtered).length}/${total} secret(s), skipped ${skipped} unreferenced`
    : `injecting all ${total} referenced secret(s)`;

  return { filtered, reason };
}
