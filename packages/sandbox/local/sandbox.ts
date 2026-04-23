import { spawn } from "child_process";
import type { Dirent } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  ExecResult,
  Sandbox,
  SandboxHooks,
  SandboxStats,
  SandboxType,
  SnapshotResult,
} from "../interface";
import type { LocalState } from "./state";
import { getSandboxEnv } from "../env";

const DEFAULT_MAX_EXEC_OUTPUT = 500_000;

function getReplitDomain(): string | null {
  const env = getSandboxEnv();
  return (
    env.REPLIT_DEV_DOMAIN ||
    process.env.REPLIT_DOMAINS?.split(",")[0] ||
    null
  );
}

export interface LocalSandboxOptions {
  env?: Record<string, string>;
  hooks?: SandboxHooks;
  timeout?: number;
  ports?: number[];
}

/**
 * A sandbox backed by the local filesystem and child_process.
 *
 * Designed for single-tenant Replit-style deployments where the "sandbox" is
 * simply a dedicated subdirectory on the host container.
 */
export class LocalSandbox implements Sandbox {
  readonly type: SandboxType = "cloud";
  readonly workingDirectory: string;
  readonly env?: Record<string, string>;
  readonly hooks?: SandboxHooks;
  readonly host?: string;
  readonly expiresAt?: number;
  readonly timeout?: number;
  readonly environmentDetails?: string;

  private readonly sandboxName: string;
  private readonly replitDomain: string | null;

  constructor(state: LocalState, options: LocalSandboxOptions = {}) {
    this.sandboxName = state.sandboxName;
    this.workingDirectory = state.workingDirectory;
    this.env = options.env;
    this.hooks = options.hooks;
    this.timeout = options.timeout;
    this.replitDomain = getReplitDomain();
    this.host = this.replitDomain ?? undefined;
    this.environmentDetails = `Local sandbox running on Replit. Working directory: ${state.workingDirectory}. Preview URLs use Replit's public dev domain.`;
  }

  getState(): { type: "local" } & LocalState {
    return {
      type: "local",
      sandboxName: this.sandboxName,
      workingDirectory: this.workingDirectory,
    };
  }

  private resolvePath(p: string): string {
    return path.isAbsolute(p) ? p : path.join(this.workingDirectory, p);
  }

  async readFile(p: string, _encoding: "utf-8"): Promise<string> {
    return fs.readFile(this.resolvePath(p), "utf-8");
  }

  async writeFile(
    p: string,
    content: string,
    _encoding: "utf-8",
  ): Promise<void> {
    const abs = this.resolvePath(p);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf-8");
  }

  async stat(p: string): Promise<SandboxStats> {
    const s = await fs.stat(this.resolvePath(p));
    return {
      isDirectory: () => s.isDirectory(),
      isFile: () => s.isFile(),
      size: s.size,
      mtimeMs: s.mtimeMs,
    };
  }

  async access(p: string): Promise<void> {
    await fs.access(this.resolvePath(p));
  }

  async mkdir(
    p: string,
    options: { recursive?: boolean } = {},
  ): Promise<void> {
    await fs.mkdir(this.resolvePath(p), { recursive: options.recursive });
  }

  async readdir(
    p: string,
    _options: { withFileTypes: true },
  ): Promise<Dirent[]> {
    return fs.readdir(this.resolvePath(p), { withFileTypes: true });
  }

  async exec(
    command: string,
    cwd: string,
    timeoutMs: number,
    options?: { signal?: AbortSignal },
  ): Promise<ExecResult> {
    return new Promise<ExecResult>((resolve) => {
      const resolvedCwd = path.isAbsolute(cwd)
        ? cwd
        : path.join(this.workingDirectory, cwd);

      let stdout = "";
      let stderr = "";
      let truncated = false;
      let settled = false;

      const child = spawn("/bin/bash", ["-lc", command], {
        cwd: resolvedCwd,
        env: { ...process.env, ...(this.env ?? {}) },
      });

      const finish = (exitCode: number | null, error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options?.signal?.removeEventListener("abort", onAbort);
        if (error && !stderr) {
          stderr = error.message;
        }
        resolve({
          success: exitCode === 0,
          exitCode,
          stdout,
          stderr,
          truncated,
        });
      };

      const appendOut = (buf: Buffer, target: "stdout" | "stderr") => {
        const s = buf.toString("utf-8");
        if (target === "stdout") {
          if (stdout.length + s.length > DEFAULT_MAX_EXEC_OUTPUT) {
            stdout += s.slice(0, DEFAULT_MAX_EXEC_OUTPUT - stdout.length);
            truncated = true;
          } else {
            stdout += s;
          }
        } else {
          if (stderr.length + s.length > DEFAULT_MAX_EXEC_OUTPUT) {
            stderr += s.slice(0, DEFAULT_MAX_EXEC_OUTPUT - stderr.length);
            truncated = true;
          } else {
            stderr += s;
          }
        }
      };

      child.stdout.on("data", (b) => appendOut(b, "stdout"));
      child.stderr.on("data", (b) => appendOut(b, "stderr"));
      child.on("error", (err) => finish(null, err));
      child.on("close", (code) => finish(code));

      const timer = setTimeout(() => {
        truncated = true;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, 2_000);
      }, timeoutMs);

      const onAbort = () => {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, 2_000);
      };
      options?.signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  async execDetached(
    command: string,
    cwd: string,
  ): Promise<{ commandId: string }> {
    const resolvedCwd = path.isAbsolute(cwd)
      ? cwd
      : path.join(this.workingDirectory, cwd);
    const child = spawn("/bin/bash", ["-lc", command], {
      cwd: resolvedCwd,
      env: { ...process.env, ...(this.env ?? {}) },
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { commandId: String(child.pid ?? "unknown") };
  }

  domain(port: number): string {
    if (!this.replitDomain) {
      // Fallback for non-Replit environments
      return `http://localhost:${port}`;
    }
    // Replit pattern: https://<port>-<domain> for non-primary ports.
    return `https://${port}-${this.replitDomain}`;
  }

  async stop(): Promise<void> {
    if (this.hooks?.beforeStop) {
      await this.hooks.beforeStop(this).catch(() => undefined);
    }
    // No VM to tear down; optionally remove the workdir if ephemeral.
    // Kept intact by default so sessions can be inspected/resumed.
  }

  async extendTimeout(
    _additionalMs: number,
  ): Promise<{ expiresAt: number }> {
    // No-op for local sandboxes — they don't expire.
    return { expiresAt: Number.MAX_SAFE_INTEGER };
  }

  async snapshot(): Promise<SnapshotResult> {
    // Local sandboxes don't support native snapshots.
    return { snapshotId: "" };
  }
}
