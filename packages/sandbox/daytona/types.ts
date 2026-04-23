import type { Sandbox, SandboxHooks, ExecResult, SandboxStats, SnapshotResult } from "../interface";
import type { Dirent } from "fs";

export interface DaytonaSandboxConfig {
  name?: string;
  source?: {
    url: string;
    branch?: string;
    token?: string;
    newBranch?: string;
  };
  env?: Record<string, string>;
  githubToken?: string;
  gitUser?: { name: string; email: string };
  timeout?: number;
  language?: "typescript" | "javascript" | "python";
  snapshot?: string;
  hooks?: SandboxHooks;
  ports?: number[];
}

export interface DaytonaState {
  type: "daytona";
  sandboxId?: string;
  sandboxName?: string;
  expiresAt?: number;
}

export interface DaytonaSandboxConnectConfig {
  sandboxId?: string;
  sandboxName?: string;
  hooks?: SandboxHooks;
  env?: Record<string, string>;
}
