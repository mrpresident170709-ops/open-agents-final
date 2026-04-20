import * as path from "path";
import { shellEscape } from "./utils";

interface SandboxLike {
  workingDirectory: string;
  writeFile(path: string, content: string, encoding: "utf-8"): Promise<void>;
  exec(
    command: string,
    cwd: string,
    timeoutMs: number,
  ): Promise<{ exitCode: number | null; stdout: string; stderr: string }>;
}

/**
 * Write a binary buffer into the sandbox at filePath.
 * Uses base64 round-trip via shell because sandbox.writeFile only supports utf-8.
 * Creates parent directories as needed.
 */
export async function writeBinaryToSandbox(
  sandbox: SandboxLike,
  filePath: string,
  buffer: Buffer,
): Promise<void> {
  const dir = path.dirname(filePath);
  await sandbox.exec(
    `mkdir -p ${shellEscape(dir)}`,
    sandbox.workingDirectory,
    10_000,
  );
  const tmpPath = `${filePath}.b64.tmp`;
  await sandbox.writeFile(tmpPath, buffer.toString("base64"), "utf-8");
  const result = await sandbox.exec(
    `base64 -d ${shellEscape(tmpPath)} > ${shellEscape(filePath)} && rm -f ${shellEscape(tmpPath)}`,
    sandbox.workingDirectory,
    60_000,
  );
  if (result.exitCode !== 0) {
    throw new Error(`Failed to write binary file: ${result.stderr}`);
  }
}

/**
 * Download a URL into the sandbox at filePath. Returns the byte size on success.
 */
export async function downloadUrlToSandbox(
  sandbox: SandboxLike,
  url: string,
  filePath: string,
  abortSignal?: AbortSignal,
  fetchHeaders?: Record<string, string>,
): Promise<number> {
  const response = await fetch(url, {
    signal: abortSignal,
    headers: fetchHeaders,
  });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeBinaryToSandbox(sandbox, filePath, buffer);
  return buffer.byteLength;
}
