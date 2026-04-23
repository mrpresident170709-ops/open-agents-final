// Unified Daytona module - all exports in one place
// This avoids circular dependency issues with Bun

// Re-export from interface
export type {
  ExecResult,
  Sandbox,
  SandboxHook,
  SandboxHooks,
  SandboxStats,
  SandboxType,
  SnapshotResult,
} from "../interface";

// Re-export shared types
export type { Source, FileEntry, SandboxStatus } from "../types";

// Factory
export {
  connectSandbox,
  type SandboxState,
  type ConnectOptions,
  type SandboxConnectConfig,
} from "../factory";

// Vercel (for backward compatibility)
export {
  connectVercelSandbox,
  VercelSandbox,
  type VercelSandboxConfig,
  type VercelSandboxConnectConfig,
  type VercelState,
} from "../vercel";

// Daytona
export type { DaytonaSandboxConfig, DaytonaState, DaytonaSandboxConnectConfig } from "./types";
export { connectDaytona, createDaytonaSandbox } from "./connect";
export { DaytonaSandbox } from "./sandbox";

// Local
export { LocalSandbox, connectLocal, type LocalState } from "../local";
