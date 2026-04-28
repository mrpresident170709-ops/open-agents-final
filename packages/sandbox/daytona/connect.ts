import { Daytona } from "./daytona-client";
import type { DaytonaSandboxConfig, DaytonaSandboxConnectConfig, DaytonaState } from "./types";
import { getSandboxEnv } from "../env";

export async function connectDaytona(
  state: DaytonaState,
  options?: { createIfMissing?: boolean; hooks?: import("../interface").SandboxHooks },
): Promise<any> {
  const env = getSandboxEnv();
  const daytona = new Daytona({
    apiKey: env.DAYTONA_API_KEY || process.env.DAYTONA_API_KEY,
    apiUrl: env.DAYTONA_API_URL || process.env.DAYTONA_API_URL,
    target: env.DAYTONA_TARGET || process.env.DAYTONA_TARGET,
  });

  let sandbox;

  // Auto-create if no sandboxId/name provided (for new sessions)
  if (!state.sandboxId && !state.sandboxName) {
    console.log("Creating new Daytona sandbox for session...");
    sandbox = await daytona.create({
      name: state.sandboxName,
      language: "typescript",
      envVars: {},
    });
  } else if (state.sandboxId || state.sandboxName) {
    // Reconnect to existing sandbox
    try {
      sandbox = await daytona.get(state.sandboxId || state.sandboxName!);
    } catch (error) {
      if (!options?.createIfMissing) {
        throw error;
      }
      // Create new sandbox if not found
      sandbox = await daytona.create({
        name: state.sandboxName,
        language: "typescript",
        envVars: {},
      });
    }
  } else if (options?.createIfMissing) {
    // Create new sandbox when explicitly requested
    sandbox = await daytona.create({
      name: state.sandboxName,
      language: "typescript",
      envVars: {},
    });
  }

  if (!sandbox) {
    throw new Error("Failed to create or connect to Daytona sandbox");
  }

  // Import DaytonaSandbox dynamically to avoid circular dependency
  const { DaytonaSandbox } = await import("./sandbox");
  return new DaytonaSandbox(daytona, sandbox, {
    hooks: options?.hooks,
  });
}

export async function createDaytonaSandbox(
  config: DaytonaSandboxConfig,
): Promise<any> {
  const env = getSandboxEnv();
  const daytona = new Daytona({
    apiKey: env.DAYTONA_API_KEY || process.env.DAYTONA_API_KEY,
    apiUrl: env.DAYTONA_API_URL || process.env.DAYTONA_API_URL,
    target: env.DAYTONA_TARGET || process.env.DAYTONA_TARGET,
  });

  const sandbox = await daytona.create({
    name: config.name,
    language: config.language || "typescript",
    envVars: config.env || {},
    snapshot: config.snapshot,
  });

  // Import DaytonaSandbox dynamically to avoid circular dependency
  const { DaytonaSandbox } = await import("./sandbox");
  const daytonaSandbox = new DaytonaSandbox(daytona, sandbox, config);

  // Run afterStart hook if provided
  if (config.hooks?.afterStart) {
    await config.hooks.afterStart(daytonaSandbox);
  }

  return daytonaSandbox;
}
