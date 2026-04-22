import type { Sandbox } from "@open-harness/sandbox";

const ENV_FILE_NAME = ".env.local";
const MANAGED_BLOCK_START = "# >>> Open Harness managed secrets >>>";
const MANAGED_BLOCK_END = "# <<< Open Harness managed secrets <<<";

// Markers that indicate a directory is a project root that should receive .env.local
const PROJECT_MARKERS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "Cargo.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
];

// Directories never to descend into
const SKIP_DIRS = new Set([
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
]);

function escapeValue(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

function buildManagedBlock(secrets: Record<string, string>): string {
  const lines = [MANAGED_BLOCK_START];
  for (const [name, value] of Object.entries(secrets)) {
    lines.push(`${name}=${escapeValue(value)}`);
  }
  lines.push(MANAGED_BLOCK_END);
  return lines.join("\n");
}

function stripManagedBlock(content: string): string {
  const startIdx = content.indexOf(MANAGED_BLOCK_START);
  if (startIdx === -1) return content;
  const endIdx = content.indexOf(MANAGED_BLOCK_END, startIdx);
  if (endIdx === -1) return content;
  const before = content.slice(0, startIdx).replace(/\n+$/, "");
  const after = content
    .slice(endIdx + MANAGED_BLOCK_END.length)
    .replace(/^\n+/, "");
  return [before, after].filter(Boolean).join("\n");
}

async function writeEnvFile(
  sandbox: Sandbox,
  filePath: string,
  secrets: Record<string, string>,
): Promise<void> {
  let existing = "";
  try {
    existing = await sandbox.readFile(filePath, "utf-8");
  } catch {
    existing = "";
  }

  if (Object.keys(secrets).length === 0) {
    if (!existing) return;
    const cleaned = stripManagedBlock(existing);
    if (cleaned !== existing) {
      await sandbox.writeFile(filePath, cleaned, "utf-8");
    }
    return;
  }

  const cleanedExisting = stripManagedBlock(existing).trimEnd();
  const block = buildManagedBlock(secrets);
  const newContent = cleanedExisting
    ? `${cleanedExisting}\n\n${block}\n`
    : `${block}\n`;

  await sandbox.writeFile(filePath, newContent, "utf-8");
}

/**
 * Find all project roots in the workspace by looking for marker files
 * (package.json, pyproject.toml, etc.) up to a shallow depth. Returns
 * paths relative to the sandbox working directory.
 */
async function findProjectRoots(
  sandbox: Sandbox,
  maxDepth: number = 2,
): Promise<string[]> {
  const roots = new Set<string>(["."]);

  async function walk(dirPath: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries: { name: string; isDirectory: () => boolean }[] = [];
    try {
      entries = (await sandbox.readdir(dirPath, {
        withFileTypes: true,
      })) as { name: string; isDirectory: () => boolean }[];
    } catch {
      return;
    }

    let hasMarker = false;
    for (const entry of entries) {
      if (!entry.isDirectory() && PROJECT_MARKERS.includes(entry.name)) {
        hasMarker = true;
        break;
      }
    }
    if (hasMarker && dirPath !== ".") {
      roots.add(dirPath);
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "." || entry.name === "..") continue;
      if (entry.name.startsWith(".")) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      const childPath = dirPath === "." ? entry.name : `${dirPath}/${entry.name}`;
      await walk(childPath, depth + 1);
    }
  }

  await walk(".", 0);
  return Array.from(roots);
}

/**
 * Write user secrets into `.env.local` in the workspace root AND in every
 * detected project subdirectory (anywhere with a package.json, pyproject.toml,
 * etc.). Each file gets the secrets inside a marked managed block, so any
 * user/agent additions in those .env.local files are preserved.
 *
 * This makes secrets available to:
 *   - Next.js / Vite / CRA (which auto-load .env.local)
 *   - Node apps using dotenv
 *   - Python apps using python-dotenv
 *   - Any tool that reads dotenv-style files
 *
 * Without depending on the sandbox SDK propagating env to detached subprocesses.
 */
export async function injectSecretsAsEnvFile(
  sandbox: Sandbox,
  secrets: Record<string, string>,
): Promise<void> {
  const projectRoots = await findProjectRoots(sandbox).catch(() => ["."]);

  for (const root of projectRoots) {
    const filePath = root === "." ? ENV_FILE_NAME : `${root}/${ENV_FILE_NAME}`;
    try {
      await writeEnvFile(sandbox, filePath, secrets);
    } catch (err) {
      console.error(
        `[inject-secrets] failed to write ${filePath}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
