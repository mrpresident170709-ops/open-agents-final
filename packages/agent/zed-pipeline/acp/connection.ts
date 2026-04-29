import type {
  SessionId,
  PromptResponse,
  PromptCapabilities,
  ContentBlock,
  SessionUpdate,
  PlanEntry,
  StopReason,
  ToolCall,
  PermissionOption,
  PermissionOptionId,
  ToolCallId,
  SessionMode,
  SessionConfigOption,
  UsageUpdate,
  ToolKind,
  Error as AcpError,
} from "./types";

export interface AgentConnection {
  telemetryId(): string;

  prompt(
    sessionId: SessionId,
    prompt: ContentBlock[],
    capabilities: PromptCapabilities,
    cx: unknown,
  ): AsyncIterable<SessionUpdate>;

  truncate?(sessionId: SessionId, cx: unknown): unknown;

  cancel(sessionId: SessionId, cx: unknown): void;

  permission(
    sessionId: SessionId,
    toolCall: ToolCall,
    options: PermissionOption[],
    cx: unknown,
  ): Promise<{ optionId: PermissionOptionId }>;

  sessionModes?(sessionId: SessionId, cx: unknown): SessionMode[];

  sessionConfigOptions?(sessionId: SessionId, cx: unknown): SessionConfigOption[];

  updateWorkingDirectories?(
    sessionId: SessionId,
    directories: string[],
    cx: unknown,
  ): void;

  switchMode?(sessionId: SessionId, modeId: SessionMode["id"], cx: unknown): void;

  updateConfigOptions?(
    sessionId: SessionId,
    options: SessionConfigOption[],
    cx: unknown,
  ): void;
}

export interface AgentSessionInfo {
  sessionId: SessionId;
  parentSessionId?: SessionId;
  title?: string;
}

export interface AgentModelInfo {
  id: string;
  name: string;
  description?: string;
  icon?: AgentModelIcon;
  isLatest?: boolean;
  cost?: string;
}

export type AgentModelIcon =
  | { type: "path"; path: string }
  | { type: "named"; name: string };

export type AgentModelList =
  | { type: "flat"; models: AgentModelInfo[] }
  | { type: "grouped"; groups: Map<string, AgentModelInfo[]> };

export interface AgentSessionListRequest {
  workDirs?: string[];
}

export interface AgentSessionListResponse {
  sessions: AgentSessionInfo[];
}

export type AgentSessionUpdate =
  | { type: "title"; title: string }
  | { type: "token_usage"; usage: TokenUsage }
  | { type: "cost"; amount: number; currency: string }
  | { type: "plan"; entries: PlanEntry[] }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "stop"; reason: StopReason }
  | { type: "mode"; modeId: string }
  | { type: "config_options"; options: SessionConfigOption[] }
  | { type: "working_directories"; directories: string[] };

export interface TokenUsage {
  maxTokens: number;
  usedTokens: number;
  inputTokens: number;
  outputTokens: number;
  maxOutputTokens?: number;
}
