import type {
  SessionId,
  UserMessageId,
  ContentBlock,
  StopReason,
  PlanEntry,
  TokenUsage,
  PromptCapabilities,
} from "../acp";

export enum ThreadEventKind {
  UserMessage = "user_message",
  AgentText = "agent_text",
  AgentThinking = "agent_thinking",
  ToolCall = "tool_call",
  ToolCallUpdate = "tool_call_update",
  ToolCallAuthorization = "tool_call_authorization",
  Plan = "plan",
  SubagentSpawned = "subagent_spawned",
  Retry = "retry",
  Stop = "stop",
  Error = "error",
  TitleUpdated = "title_updated",
  TokenUsageUpdated = "token_usage_updated",
}

export interface BaseThreadEvent {
  kind: ThreadEventKind;
}

export interface UserMessageEvent extends BaseThreadEvent {
  kind: ThreadEventKind.UserMessage;
  id: UserMessageId;
  content: ContentBlock[];
}

export interface AgentTextEvent extends BaseThreadEvent {
  kind: ThreadEventKind.AgentText;
  text: string;
}

export interface AgentThinkingEvent extends BaseThreadEvent {
  kind: ThreadEventKind.AgentThinking;
  text: string;
}

export interface ToolCallEvent extends BaseThreadEvent {
  kind: ThreadEventKind.ToolCall;
  toolCall: ToolCall;
}

export interface ToolCallUpdateEvent extends BaseThreadEvent {
  kind: ThreadEventKind.ToolCallUpdate;
  toolCallId: string;
  fields: ToolCallUpdateFields;
}

export interface ToolCallAuthorizationEvent extends BaseThreadEvent {
  kind: ThreadEventKind.ToolCallAuthorization;
  toolCall: ToolCall;
  options: ThreadPermissionOption[];
  context?: ToolPermissionContext;
}

export interface PlanEvent extends BaseThreadEvent {
  kind: ThreadEventKind.Plan;
  entries: PlanEntry[];
}

export interface SubagentSpawnedEvent extends BaseThreadEvent {
  kind: ThreadEventKind.SubagentSpawned;
  sessionId: SessionId;
}

export interface RetryEvent extends BaseThreadEvent {
  kind: ThreadEventKind.Retry;
  status: RetryStatus;
}

export interface StopEvent extends BaseThreadEvent {
  kind: ThreadEventKind.Stop;
  reason: StopReason;
}

export interface ErrorEvent extends BaseThreadEvent {
  kind: ThreadEventKind.Error;
  error: Error;
}

export interface TitleUpdatedEvent extends BaseThreadEvent {
  kind: ThreadEventKind.TitleUpdated;
  title?: string;
}

export interface TokenUsageUpdatedEvent extends BaseThreadEvent {
  kind: ThreadEventKind.TokenUsageUpdated;
  usage: TokenUsage;
}

export type ThreadEvent =
  | UserMessageEvent
  | AgentTextEvent
  | AgentThinkingEvent
  | ToolCallEvent
  | ToolCallUpdateEvent
  | ToolCallAuthorizationEvent
  | PlanEvent
  | SubagentSpawnedEvent
  | RetryEvent
  | StopEvent
  | ErrorEvent
  | TitleUpdatedEvent
  | TokenUsageUpdatedEvent;

export enum MessageRole {
  User = "user",
  Assistant = "assistant",
}

export interface UserMessage {
  id: UserMessageId;
  role: MessageRole.User;
  content: UserMessageContent[];
  timestamp: number;
}

export enum UserMessageContentType {
  Text = "text",
  Mention = "mention",
  Image = "image",
}

export interface TextContent {
  type: UserMessageContentType.Text;
  text: string;
}

export interface MentionContent {
  type: UserMessageContentType.Mention;
  uri: string;
  content: string;
}

export interface ImageContent {
  type: UserMessageContentType.Image;
  data: string;
  mimeType: string;
}

export type UserMessageContent = TextContent | MentionContent | ImageContent;

export interface AgentMessage {
  role: MessageRole.Assistant;
  content: AgentMessageContent[];
  toolResults: Map<string, ToolResult>;
  reasoningDetails?: Record<string, unknown>;
}

export enum AgentMessageContentType {
  Text = "text",
  Thinking = "thinking",
  RedactedThinking = "redacted_thinking",
  ToolUse = "tool_use",
}

export interface AgentTextContent {
  type: AgentMessageContentType.Text;
  text: string;
}

export interface AgentThinkingContent {
  type: AgentMessageContentType.Thinking;
  text: string;
  signature?: string;
}

export interface AgentRedactedThinkingContent {
  type: AgentMessageContentType.RedactedThinking;
  data: string;
}

export interface AgentToolUseContent {
  type: AgentMessageContentType.ToolUse;
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AgentMessageContent =
  | AgentTextContent
  | AgentThinkingContent
  | AgentRedactedThinkingContent
  | AgentToolUseContent;

export interface ToolResult {
  toolUseId: string;
  toolName: string;
  content: ToolResultContent[];
  isError: boolean;
  output?: Record<string, unknown>;
}

export interface ToolResultTextContent {
  type: "text";
  text: string;
}

export interface ToolResultImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export type ToolResultContent = ToolResultTextContent | ToolResultImageContent;

export type Message = UserMessage | AgentMessage;

export interface ToolCall {
  id: string;
  name: string;
  title: string;
  kind: ToolCallKind;
  status: ToolCallStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  locations: ToolCallLocation[];
  content: ToolCallContentItem[];
  subagentSessionInfo?: SubagentSessionInfo;
}

export enum ToolCallKind {
  Read = "read",
  Edit = "edit",
  Execute = "execute",
}

export enum ToolCallStatus {
  Pending = "pending",
  WaitingForConfirmation = "waiting_for_confirmation",
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
  Rejected = "rejected",
  Canceled = "canceled",
}

export interface ToolCallLocation {
  path: string;
  line?: number;
}

export interface ToolCallContentItem {
  type: "text" | "diff" | "terminal";
  text?: string;
  diff?: DiffContent;
  terminalId?: string;
}

export interface DiffContent {
  path: string;
  oldText?: string;
  newText: string;
}

export interface ToolCallUpdateFields {
  kind?: ToolCallKind;
  status?: ToolCallStatus;
  title?: string;
  content?: ToolCallContentItem[];
  locations?: ToolCallLocation[];
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
}

export interface ThreadPermissionOption {
  id: string;
  title: string;
  kind: PermissionOptionKind;
}

export enum PermissionOptionKind {
  AllowOnce = "allow_once",
  AllowAlways = "allow_always",
  Reject = "reject",
  RejectAlways = "reject_always",
}

export interface ToolPermissionContext {
  toolName: string;
  inputValues: string[];
  scope: ToolPermissionScope;
}

export enum ToolPermissionScope {
  ToolInput = "tool_input",
  SymlinkTarget = "symlink_target",
}

export interface SubagentSessionInfo {
  sessionId: string;
  messageStartIndex: number;
  messageEndIndex?: number;
}

export interface RetryStatus {
  lastError: string;
  attempt: number;
  maxAttempts: number;
  startedAt: number;
  durationMs: number;
}

export interface RunningTurn {
  id: number;
  cancel: () => void;
  promise: Promise<StopReason>;
}

export interface ThreadOptions {
  sessionId: SessionId;
  projectContext: ProjectContext;
  model?: string;
  summarizationModel?: string;
  thinkingEnabled?: boolean;
  thinkingEffort?: string;
  speed?: string;
  profileId?: string;
}

export interface ProjectContext {
  worktrees: WorktreeContext[];
  userRules: UserRulesContext[];
}

export interface WorktreeContext {
  rootName: string;
  absPath: string;
  rulesFile?: RulesFileContext;
}

export interface RulesFileContext {
  pathInWorktree: string;
  text: string;
  entryId: number;
}

export interface UserRulesContext {
  uuid: string;
  title?: string;
  contents: string;
}

export interface ThreadSnapshot {
  sessionId: string;
  title?: string;
  messages: SerializedMessage[];
  plan: PlanEntry[];
  tokenUsage: TokenUsage;
  createdAt: number;
  updatedAt: number;
  model?: string;
  profileId?: string;
  thinkingEnabled: boolean;
  thinkingEffort?: string;
}

export interface SerializedMessage {
  role: MessageRole;
  content: SerializedContent[];
  toolResults?: SerializedToolResult[];
}

export interface SerializedContent {
  type: string;
  text?: string;
  signature?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  uri?: string;
  data?: string;
  mimeType?: string;
}

export interface SerializedToolResult {
  toolUseId: string;
  toolName: string;
  content: SerializedContent[];
  isError: boolean;
  output?: Record<string, unknown>;
}
