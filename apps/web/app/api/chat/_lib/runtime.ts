import { discoverSkills } from "@open-harness/agent";
import { connectSandbox } from "@open-harness/sandbox";
import { getUserGitHubToken } from "@/lib/github/user-token";
import { DEFAULT_SANDBOX_PORTS } from "@/lib/sandbox/config";
import { injectSecretsAsEnvFile } from "@/lib/sandbox/inject-secrets-env-file";
import { analyzeEnvVarUsage, filterSecretsByUsage } from "@/lib/sandbox/analyze-env-usage";
import { getSandboxSkillDirectories } from "@/lib/skills/directories";
import { getCachedSkills, setCachedSkills } from "@/lib/skills-cache";
import {
  getUserSecretsDecrypted,
  getUserSecretNames,
  type SecretEnvironment,
  SECRET_ENVIRONMENTS,
} from "@/lib/db/user-secrets";
import type { SessionRecord } from "./chat-context";

type DiscoveredSkills = Awaited<ReturnType<typeof discoverSkills>>;
type ConnectedSandbox = Awaited<ReturnType<typeof connectSandbox>>;
type ActiveSandboxState = NonNullable<SessionRecord["sandboxState"]>;

/**
 * Detect the current runtime environment so env-scoped secrets are merged
 * correctly. Falls back to "development" if unset or unrecognised.
 */
function detectSandboxEnvironment(): SecretEnvironment {
  const raw = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  return (SECRET_ENVIRONMENTS as readonly string[]).includes(raw)
    ? (raw as SecretEnvironment)
    : "development";
}

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

export interface ChatRuntime {
  sandbox: ConnectedSandbox;
  skills: DiscoveredSkills;
  /** Names of secrets that were actually injected into the sandbox this turn. */
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

  // Resolve the sandbox environment so env-scoped secrets are merged correctly.
  // 'all' secrets always apply; env-specific secrets overlay them when matched.
  const sandboxEnv = detectSandboxEnvironment();

  // Fetch decrypted secrets and GitHub token in parallel.
  // We intentionally do NOT pass user secrets to connectSandbox — they are
  // injected only into .env.local (below) after static analysis narrows them
  // to what the code actually uses. This limits attack surface: unreferenced
  // secrets are never placed in the sandbox environment.
  const [githubToken, allUserSecrets] = await Promise.all([
    getUserGitHubToken(userId),
    getUserSecretsDecrypted(userId, sandboxEnv).catch((err) => {
      console.error("[runtime] failed to load user secrets:", err);
      return {} as Record<string, string>;
    }),
  ]);

  // Connect sandbox WITHOUT user secrets — they reach the workspace only via
  // .env.local (written after static analysis), so child processes never inherit
  // secrets they don't need.
  const sandbox = await connectSandbox(sandboxState, {
    githubToken: githubToken ?? undefined,
    ports: DEFAULT_SANDBOX_PORTS,
  });

  // ── Lazy secret injection ──────────────────────────────────────────────────
  // Scan the workspace source code for env var references (process.env.X,
  // os.environ['X'], import.meta.env.X, etc.) and inject only the secrets
  // that the code actually uses. Unreferenced secrets are not written to disk.
  const availableNames = Object.keys(allUserSecrets);
  let injectedSecretNames: string[] = [];

  if (availableNames.length > 0) {
    const referenced = await analyzeEnvVarUsage(sandbox, availableNames);
    const { filtered, reason } = filterSecretsByUsage(allUserSecrets, referenced);

    console.info(`[runtime] secret injection: ${reason}`);

    // Write the filtered set to .env.local in all project roots.
    // Frameworks (Next.js, Vite, Bun, python-dotenv, etc.) load this file
    // automatically at startup, so user code picks up only what it references.
    await injectSecretsAsEnvFile(sandbox, filtered).catch((err) => {
      console.error("[runtime] failed to write secrets to .env.local:", err);
    });

    injectedSecretNames = Object.keys(filtered);
  } else {
    // No secrets configured — clear any stale managed block from .env.local
    await injectSecretsAsEnvFile(sandbox, {}).catch(() => {});
  }

  // Build the full list of secret NAMES the agent may reference in its system
  // prompt (only injected ones — the agent should not mention secrets that
  // aren't available in this sandbox).
  // Fetch names via the same env-aware filter used above.
  const allSecretNames = await getUserSecretNames(userId, sandboxEnv).catch(() => [] as string[]);
  const injectedSet = new Set(injectedSecretNames);
  // Present injected first, then note remaining ones are available but not yet used
  const secretNames = [
    ...injectedSecretNames,
    ...allSecretNames.filter((n) => !injectedSet.has(n)),
  ];

  const skills = await loadSessionSkills(sessionId, sandboxState, sandbox);

  return {
    sandbox,
    skills,
    secretNames,
  };
}
