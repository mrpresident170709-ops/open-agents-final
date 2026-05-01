export interface SessionId {
  readonly __brand: "SessionId";
  value: string;
}

export function createSessionId(value: string): SessionId {
  return { __brand: "SessionId" as const, value };
}

export interface ToolCallId {
  readonly __brand: "ToolCallId";
  value: string;
}

export function createToolCallId(value: string): ToolCallId {
  return { __brand: "ToolCallId" as const, value };
}

export interface ModelId {
  readonly __brand: "ModelId";
  value: string;
}

export function createModelId(value: string): ModelId {
  return { __brand: "ModelId" as const, value };
}

export interface RequestId {
  readonly __brand: "RequestId";
  value: string | number;
}

export function createRequestId(value: string | number): RequestId {
  return { __brand: "RequestId" as const, value };
}

export interface TerminalId {
  readonly __brand: "TerminalId";
  value: string;
}

export function createTerminalId(value: string): TerminalId {
  return { __brand: "TerminalId" as const, value };
}

export interface UserMessageId {
  readonly __brand: "UserMessageId";
  value: string;
}

export function createUserMessageId(): UserMessageId {
  return {
    __brand: "UserMessageId" as const,
    value: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  };
}

export enum ToolKind {
  Read = "read",
  Edit = "edit",
  Execute = "execute",
}

export enum ToolCallStatus {
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
}

export enum PermissionOptionKind {
  AllowOnce = "allow_once",
  AllowAlways = "allow_always",
  Reject = "reject",
}

export interface AcpPermissionOption {
  id: PermissionOptionId;
  title: string;
  kind: PermissionOptionKind;
}

export interface PermissionOptionId {
  readonly __brand: "PermissionOptionId";
  value: string;
}

export interface AcpToolCall {
  tool_call_id: ToolCallId;
  kind: ToolKind;
  status: ToolCallStatus;
  title: string;
  content: ToolCallContent[];
  locations: AcpToolCallLocation[];
  raw_input?: Record<string, unknown>;
  raw_output?: Record<string, unknown>;
  meta?: Meta;
}

export interface AcpToolCallLocation {
  path: string;
  line?: number;
}

export interface ToolCallContent {
  type: "content" | "diff" | "terminal";
  content?: ContentBlock[];
  diff?: AcpDiffContent;
  terminal?: TerminalContent;
}

export interface AcpDiffContent {
  path: string;
  old_text?: string;
  new_text: string;
}

export interface TerminalContent {
  terminal_id: TerminalId;
}

export interface ToolCallUpdate {
  tool_call_id: ToolCallId;
  kind?: ToolKind;
  status?: ToolCallStatus;
  title?: string;
  content?: ToolCallContent[];
  locations?: AcpToolCallLocation[];
  raw_input?: Record<string, unknown>;
  raw_output?: Record<string, unknown>;
}

export interface ContentBlock {
  type: "text" | "resource_link" | "image" | "resource";
  text?: string;
  resource_link?: ResourceLink;
  image?: AcpImageContent;
  resource?: EmbeddedResource;
}

export interface AcpTextContent {
  type: "text";
  text: string;
}

export interface ResourceLink {
  uri: string;
  name?: string;
  description?: string;
}

export interface AcpImageContent {
  data: string;
  mime_type: string;
}

export interface EmbeddedResource {
  type: "resource";
  resource: EmbeddedResourceResource;
}

export interface EmbeddedResourceResource {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ContentChunk {
  content: ContentBlock;
}

export interface Meta {
  [key: string]: unknown;
}

export interface PlanEntry {
  content: string;
  priority: PlanEntryPriority;
  status: PlanEntryStatus;
}

export enum PlanEntryPriority {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum PlanEntryStatus {
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
}

export interface Plan {
  entries: PlanEntry[];
}

export interface Terminal {
  terminal_id: TerminalId;
  title: string;
  cwd?: string;
  output_byte_limit?: number;
}

export interface TerminalExitStatus {
  code?: number;
  reason: "exit" | "error" | "cancelled";
}

export interface SessionUpdate {
  type:
    | "user_message_chunk"
    | "agent_message_chunk"
    | "agent_thought_chunk"
    | "tool_call"
    | "tool_call_update"
    | "plan"
    | "session_info"
    | "available_commands"
    | "current_mode"
    | "config_option"
    | "usage";
  payload: unknown;
}

export interface UserMessageChunkUpdate {
  type: "user_message_chunk";
  content: ContentChunk;
}

export interface AgentMessageChunkUpdate {
  type: "agent_message_chunk";
  content: ContentChunk;
}

export interface AgentThoughtChunkUpdate {
  type: "agent_thought_chunk";
  content: ContentChunk;
}

export interface ToolCallSessionUpdate {
  type: "tool_call";
  tool_call: AcpToolCall;
}

export interface ToolCallUpdateSessionUpdate {
  type: "tool_call_update";
  tool_call_update: ToolCallUpdate;
}

export interface PlanSessionUpdate {
  type: "plan";
  plan: Plan;
}

export interface SessionInfoUpdate {
  type: "session_info";
  title?: string;
}

export interface AvailableCommandsUpdate {
  type: "available_commands";
  available_commands: AvailableCommand[];
}

export interface AvailableCommand {
  name: string;
  description: string;
  input?: AvailableCommandInput;
}

export interface UnstructuredCommandInput {
  hint: string;
}

export type AvailableCommandInput = UnstructuredCommandInput;

export enum StopReason {
  EndTurn = "end_turn",
  ToolCalls = "tool_calls",
  Cancelled = "cancelled",
  MaxTokens = "max_tokens",
  Error = "error",
}

export interface PromptResponse {
  stop_reason: StopReason;
}

export interface PromptCapabilities {
  image: boolean;
  web_search: boolean;
  document: boolean;
}

export interface SessionMode {
  id: SessionModeId;
  name: string;
  description: string;
}

export interface SessionModeId {
  readonly __brand: "SessionModeId";
  value: string;
}

export interface SessionConfigOption {
  name: string;
  value: string;
  description?: string;
}

export interface UsageUpdate {
  size: number;
  used: number;
  cost?: {
    amount: number;
    currency: string;
  };
}

export interface Error {
  code: number;
  message: string;
  data?: unknown;
}
