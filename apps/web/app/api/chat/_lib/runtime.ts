import { discoverSkills } from "@open-harness/agent";
import { connectSandbox } from "@open-harness/sandbox";
import { getUserGitHubToken } from "@/lib/github/user-token";
import { DEFAULT_SANDBOX_PORTS } from "@/lib/sandbox/config";
import { injectSecretsAsEnvFile } from "@/lib/sandbox/inject-secrets-env-file";
import { getSandboxSkillDirectories } from "@/lib/skills/directories";
import { getCachedSkills, setCachedSkills } from "@/lib/skills-cache";
import {
  getUserSecretsDecrypted,
  getUserSecretNames,
} from "@/lib/db/user-secrets";
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
  const [githubToken, userEnv, secretNames] = await Promise.all([
    getUserGitHubToken(userId),
    getUserSecretsDecrypted(userId).catch((err) => {
      console.error("[runtime] failed to load user secrets:", err);
      return {} as Record<string, string>;
    }),
    getUserSecretNames(userId).catch(() => [] as string[]),
  ]);

  const sandbox = await connectSandbox(sandboxState, {
    githubToken: githubToken ?? undefined,
    ports: DEFAULT_SANDBOX_PORTS,
    // Inject user-owned secrets as environment variables in the sandbox process.
    // The agent receives only the names (not values) via the system prompt so
    // it can reference process.env.SECRET_NAME without ever seeing the value.
    ...(Object.keys(userEnv).length > 0 && { env: userEnv }),
  });

  // Also write secrets into `.env.local` in the workspace so that already-running
  // dev servers (Next.js, Vite, etc.) and any subprocess pick them up reliably,
  // even if env injection through the sandbox SDK doesn't propagate to detached
  // processes started in earlier turns.
  await injectSecretsAsEnvFile(sandbox, userEnv).catch((err) => {
    console.error("[runtime] failed to write secrets to .env.local:", err);
  });

  const skills = await loadSessionSkills(sessionId, sandboxState, sandbox);

  return {
    sandbox,
    skills,
    secretNames,
  };
}
