import type { Sandbox } from "@open-harness/sandbox";

const ENV_FILE_PATH = ".env.local";
const MANAGED_BLOCK_START = "# >>> Open Harness managed secrets >>>";
const MANAGED_BLOCK_END = "# <<< Open Harness managed secrets <<<";

function escapeValue(value: string): string {
  // Wrap in double quotes and escape internal quotes/backslashes/newlines
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
  const after = content.slice(endIdx + MANAGED_BLOCK_END.length).replace(/^\n+/, "");
  return [before, after].filter(Boolean).join("\n");
}

/**
 * Write user secrets into `.env.local` in the workspace, inside a clearly
 * marked managed block. Preserves any other content the user/agent has placed
 * in the file. This makes secrets available to Next.js, Vite, Node scripts,
 * and any other process that reads .env.local — without requiring a server
 * restart or relying on env propagation through detached subprocesses.
 */
export async function injectSecretsAsEnvFile(
  sandbox: Sandbox,
  secrets: Record<string, string>,
): Promise<void> {
  if (Object.keys(secrets).length === 0) {
    // If there are no secrets, strip any prior managed block but don't error.
    try {
      const existing = await sandbox.readFile(ENV_FILE_PATH, "utf-8");
      const cleaned = stripManagedBlock(existing);
      if (cleaned !== existing) {
        await sandbox.writeFile(ENV_FILE_PATH, cleaned, "utf-8");
      }
    } catch {
      // file doesn't exist; nothing to clean
    }
    return;
  }

  let existing = "";
  try {
    existing = await sandbox.readFile(ENV_FILE_PATH, "utf-8");
  } catch {
    existing = "";
  }

  const cleanedExisting = stripManagedBlock(existing).trimEnd();
  const block = buildManagedBlock(secrets);
  const newContent = cleanedExisting
    ? `${cleanedExisting}\n\n${block}\n`
    : `${block}\n`;

  await sandbox.writeFile(ENV_FILE_PATH, newContent, "utf-8");
}
