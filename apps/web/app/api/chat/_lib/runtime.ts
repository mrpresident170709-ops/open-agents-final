import { discoverSkills } from "@open-harness/agent";
import { connectSandbox } from "@open-harness/sandbox";
import { getUserGitHubToken } from "@/lib/github/user-token";
import { DEFAULT_SANDBOX_PORTS } from "@/lib/sandbox/config";
import { getSandboxSkillDirectories } from "@/lib/skills/directories";
import { getCachedSkills, setCachedSkills } from "@/lib/skills-cache";
import {
  getUserSecretsDecrypted,
  getUserSecretNames,
} from "@/lib/db/user-secrets";
import { createRedactor } from "@/lib/secret-redactor";
import { wrapSandboxWithRedaction } from "@/lib/sandbox/redacting-sandbox";
import type { SessionRecord } from "./chat-context";

type DiscoveredSkills = Awaited<ReturnType<typeof discoverSkills>>;
type ConnectedSandbox = Awaited<ReturnType<typeof connectSandbox>>;
type ActiveSandboxState = NonNullable<SessionRecord["sandboxState"]>;

async function loadSessionSkills(
  sessionId: string,
  sandboxState: ActiveSandboxState,
  sandbox: ConnectedSandbox,
): Promise<DiscoveredSkills> {
  const cachedSkills = await getCachedSkills(sessionId, sandboxState);
  if (cachedSkills !== null) {
    return cachedSkills;
  }

  const skillDirs = await getSandboxSkillDirectories(sandbox);
  const discoveredSkills = await discoverSkills(sandbox, skillDirs);
  await setCachedSkills(sessionId, sandboxState, discoveredSkills);
  return discoveredSkills;
}

/**
 * Grep the sandbox filesystem for all `process.env.VARNAME` references and
 * return the set of referenced variable names. Used for lazy secret injection.
 */
async function findReferencedEnvVars(
  sandbox: ConnectedSandbox,
): Promise<Set<string>> {
  try {
    const result = await sandbox.exec(
      // Search common source files for process.env.VARNAME patterns.
      // -h suppresses filename prefixes; we pipe to extract just the name.
      String.raw`grep -rh "process\.env\." . \
        --include="*.ts" --include="*.tsx" \
        --include="*.js" --include="*.jsx" \
        --include="*.mjs" --include="*.cjs" \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        2>/dev/null \
        | grep -oE "process\.env\.[A-Z][A-Z0-9_]+" \
        | sed 's/process\.env\.//' \
        | sort -u`,
      sandbox.workingDirectory,
      15_000,
    );

    if (!result.success || !result.stdout.trim()) {
      return new Set();
    }

    return new Set(
      result.stdout
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } catch {
    // Non-fatal: fall back to empty set (no filtering)
    return new Set();
  }
}

export interface ChatRuntime {
  sandbox: ConnectedSandbox;
  skills: DiscoveredSkills;
  secretNames: string[];
}

export async function createChatRuntime(params: {
  userId: string;
  sessionId: string;
  sessionRecord: SessionRecord;
}): Promise<ChatRuntime> {
  const { userId, sessionId, sessionRecord } = params;

  const sandboxState = sessionRecord.sandboxState;
  if (!sandboxState) {
    throw new Error("Sandbox state is required to create chat runtime");
  }

  // Fetch user secrets and GitHub token in parallel
  const [githubToken, userEnv, allSecretNames] = await Promise.all([
    getUserGitHubToken(userId),
    getUserSecretsDecrypted(userId).catch((err) => {
      console.error("[runtime] failed to load user secrets:", err);
      return {} as Record<string, string>;
    }),
    getUserSecretNames(userId).catch(() => [] as string[]),
  ]);

  const hasSecrets = Object.keys(userEnv).length > 0;

  if (!hasSecrets) {
    // No secrets at all — single connect, no filtering needed.
    // Still wrap with a pattern-only redactor: even without user secrets,
    // any sk-/eyJ/AKIA token that appears in stdout (e.g. from a hardcoded
    // value or third-party API response) gets scrubbed.
    const sandbox = await connectSandbox(sandboxState, {
      githubToken: githubToken ?? undefined,
      ports: DEFAULT_SANDBOX_PORTS,
    });
    const wrapped = wrapSandboxWithRedaction(sandbox, createRedactor({}));
    const skills = await loadSessionSkills(sessionId, sandboxState, wrapped);
    return { sandbox: wrapped, skills, secretNames: [] };
  }

  // Phase 1: Connect without secrets so we can safely grep the project code.
  // The grep result tells us exactly which secrets are actually referenced,
  // so we only inject what the code needs (lazy injection).
  const probeSandbox = await connectSandbox(sandboxState, {
    githubToken: githubToken ?? undefined,
    ports: DEFAULT_SANDBOX_PORTS,
  });

  const referencedNames = await findReferencedEnvVars(probeSandbox);

  // Filter decrypted values and names to the referenced subset only.
  // If grep returned nothing (empty project or grep failed), fall back to all secrets.
  const filteredEnv =
    referencedNames.size > 0
      ? Object.fromEntries(
          Object.entries(userEnv).filter(([name]) => referencedNames.has(name)),
        )
      : userEnv;

  const secretNames =
    referencedNames.size > 0
      ? allSecretNames.filter((name) => referencedNames.has(name))
      : allSecretNames;

  if (Object.keys(filteredEnv).length === 0) {
    // No referenced secrets — reuse the probe sandbox.
    // Build a redactor over ALL of the user's secrets (not just referenced),
    // because even though we didn't inject them as env, a value could still
    // appear in output via other paths (e.g. user pasted it into a file).
    const redactor = createRedactor(userEnv);
    const wrapped = wrapSandboxWithRedaction(probeSandbox, redactor);
    const skills = await loadSessionSkills(sessionId, sandboxState, wrapped);
    return { sandbox: wrapped, skills, secretNames: [] };
  }

  // Phase 2: Reconnect with only the secrets the code actually references.
  // The reconnect is cheap — the sandbox is already running; this just
  // attaches a new client instance with the filtered env map so every
  // subsequent agent exec() call has exactly the right env vars.
  const sandbox = await connectSandbox(sandboxState, {
    githubToken: githubToken ?? undefined,
    ports: DEFAULT_SANDBOX_PORTS,
    env: filteredEnv,
  });

  // Wrap with redactor that knows about ALL user secrets (not just the
  // injected subset). If the user references VAR_A in code but happened
  // to also store VAR_B, scrubbing both protects against a class of
  // accidental leaks where a value appears in output via an unexpected path.
  const redactor = createRedactor(userEnv);
  const wrapped = wrapSandboxWithRedaction(sandbox, redactor);

  const skills = await loadSessionSkills(sessionId, sandboxState, wrapped);

  return { sandbox: wrapped, skills, secretNames };
}
