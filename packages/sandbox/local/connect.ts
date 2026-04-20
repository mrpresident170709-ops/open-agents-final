import * as fs from "fs/promises";
import * as path from "path";
import type { Sandbox, SandboxHooks } from "../interface";
import { LocalSandbox, type LocalSandboxOptions } from "./sandbox";
import type { LocalState } from "./state";

function sandboxRoot(): string {
  return (
    process.env.LOCAL_SANDBOX_ROOT ||
    path.join(process.env.HOME ?? "/tmp", ".open-harness-sandboxes")
  );
}

function resolveSandboxName(state: Partial<LocalState>): string {
  if (state.sandboxName && state.sandboxName.length > 0) {
    return state.sandboxName;
  }
  // Fallback — generate a random name
  return `sbx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ConnectLocalOptions extends LocalSandboxOptions {
  githubToken?: string;
  gitUser?: { name: string; email: string };
  hooks?: SandboxHooks;
  skipGitWorkspaceBootstrap?: boolean;
}

/**
 * Connect to (or create) a local, filesystem-backed sandbox.
 * The sandbox directory lives under LOCAL_SANDBOX_ROOT / <sandboxName>.
 */
export async function connectLocal(
  state: Partial<LocalState>,
  options: ConnectLocalOptions = {},
): Promise<Sandbox> {
  const name = resolveSandboxName(state);
  const workingDirectory =
    state.workingDirectory && state.workingDirectory.length > 0
      ? state.workingDirectory
      : path.join(sandboxRoot(), name);

  // Ensure the directory exists
  await fs.mkdir(workingDirectory, { recursive: true });

  const resolvedState: LocalState = {
    sandboxName: name,
    workingDirectory,
  };

  const sandbox = new LocalSandbox(resolvedState, {
    env: options.env,
    hooks: options.hooks,
    timeout: options.timeout,
    ports: options.ports,
  });

  // Optional git bootstrap for empty workspaces so the agent's tools
  // that call `git status` don't error out on first run.
  if (!options.skipGitWorkspaceBootstrap) {
    try {
      await sandbox.access(".git");
    } catch {
      const userName = options.gitUser?.name ?? "Open Harness";
      const userEmail = options.gitUser?.email ?? "local@open-harness";
      await sandbox.exec(
        `git init -q && git config user.name ${JSON.stringify(userName)} && git config user.email ${JSON.stringify(userEmail)}`,
        workingDirectory,
        15_000,
      );
    }
  }

  if (options.hooks?.afterStart) {
    await options.hooks.afterStart(sandbox).catch(() => undefined);
  }

  return sandbox;
}
