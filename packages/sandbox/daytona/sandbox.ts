import type { Dirent } from "fs";
import type { Sandbox, SandboxHooks, ExecResult, SandboxStats, SnapshotResult } from "../interface";
import type { DaytonaSandboxConfig, DaytonaState } from "./types";
import { Daytona } from "./daytona-client";

interface DaytonaDirent {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

export class DaytonaSandbox implements Sandbox {
  readonly type: "cloud" = "cloud";
  readonly workingDirectory = "/home/daytona";
  readonly env?: Record<string, string>;
  readonly hooks?: SandboxHooks;
  readonly host?: string;
  readonly expiresAt?: number;
  readonly timeout?: number;
  readonly currentBranch?: string;
  readonly environmentDetails?: string;

  private sandbox: any; // Daytona SDK Sandbox instance
  private daytona: Daytona;

  constructor(
    daytona: Daytona,
    sandbox: any,
    config: DaytonaSandboxConfig,
  ) {
    this.daytona = daytona;
    this.sandbox = sandbox;
    this.env = config.env;
    this.hooks = config.hooks;
    this.timeout = config.timeout;

    if (this.timeout) {
      this.expiresAt = Date.now() + this.timeout;
    }

    this.environmentDetails = this.generateEnvironmentDetails();
  }

  private generateEnvironmentDetails(): string {
    const lines = [
      "Daytona Sandbox Environment",
      "===========================",
      "",
      "Working directory: /home/daytona",
      "Shell commands: Use `await sandbox.exec(command, cwd, timeoutMs)`",
      "File operations: readFile, writeFile, stat, access, mkdir, readdir",
      "Process execution: sandbox.process.executeCommand()",
      "Preview URLs: sandbox.getPreviewLink(port)",
      "",
      "Available tools in sandbox:",
      "  - Node.js, npm, npx",
      "  - Python, pip",
      "  - Git (if configured)",
      "",
      "Environment variables are injected per command via the env option.",
    ];
    return lines.join("\n");
  }

  async readFile(path: string, encoding: "utf-8"): Promise<string> {
    const content = await this.sandbox.fs.readFile(path);
    return content;
  }

  async writeFile(path: string, content: string, encoding: "utf-8"): Promise<void> {
    await this.sandbox.fs.uploadFile(Buffer.from(content, "utf-8"), path);
  }

  async stat(path: string): Promise<SandboxStats> {
    const stat = await this.sandbox.fs.stat(path);
    return {
      isDirectory: () => stat.isDirectory(),
      isFile: () => stat.isFile(),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  }

  async access(path: string): Promise<void> {
    try {
      await this.sandbox.fs.access(path);
    } catch {
      throw new Error(`File not found: ${path}`);
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await this.sandbox.fs.createFolder(path, "755");
  }

  async readdir(path: string, options: { withFileTypes: true }): Promise<Dirent<string>[]> {
    const files = await this.sandbox.fs.listFiles(path);
    return files.map((f: any) => ({
      name: f.name,
      isDirectory: () => f.isDirectory,
      isFile: () => !f.isDirectory,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    })) as Dirent<string>[];
  }

  async exec(
    command: string,
    cwd: string,
    timeoutMs: number,
    options?: { signal?: AbortSignal },
  ): Promise<ExecResult> {
    const response = await this.sandbox.process.executeCommand(
      command,
      cwd,
      this.env,
      Math.floor(timeoutMs / 1000),
    );

    if (options?.signal?.aborted) {
      throw new Error("Aborted");
    }

    return {
      success: response.exitCode === 0,
      exitCode: response.exitCode,
      stdout: response.result || "",
      stderr: response.result || "",
      truncated: false,
    };
  }

  async execDetached(command: string, cwd: string): Promise<{ commandId: string }> {
    const response = await this.sandbox.process.executeCommand(
      `nohup ${command} > /tmp/daytona-detached.out 2>&1 & echo $!`,
      cwd,
    );
    const pid = response.result?.trim() || `detached-${Date.now()}`;
    return { commandId: pid };
  }

  domain(port: number): string {
    const previewUrl = this.sandbox.getPreviewLink(port);
    if (previewUrl) return previewUrl;
    return `https://${this.sandbox.id}-${port}.daytona.app`;
  }

  async stop(): Promise<void> {
    if (this.hooks?.beforeStop) {
      await this.hooks.beforeStop(this);
    }
    await this.sandbox.stop();
  }

  async extendTimeout(additionalMs: number): Promise<{ expiresAt: number }> {
    const additionalSeconds = Math.floor(additionalMs / 1000);
    await this.sandbox.setAutoStopInterval(additionalSeconds);
    const newExpiresAt = Date.now() + additionalMs;
    if (this.hooks?.onTimeoutExtended) {
      await this.hooks.onTimeoutExtended(this, additionalMs);
    }
    return { expiresAt: newExpiresAt };
  }

  async snapshot(): Promise<SnapshotResult> {
    const name = `snapshot-${Date.now()}`;
    await this.sandbox._experimental_createSnapshot(name);
    return { snapshotId: name };
  }

  getState(): unknown {
    return {
      type: "daytona" as const,
      sandboxId: this.sandbox.id,
      sandboxName: this.sandbox.name,
      expiresAt: this.expiresAt,
    };
  }
}
