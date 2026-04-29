import type { SessionId, createUserMessageId, ContentBlock, StopReason, PromptCapabilities } from "../acp";
import type {
  ThreadEvent,
  ThreadEventKind,
  Message,
  UserMessage,
  AgentMessage,
  AgentMessageContent,
  AgentTextContent,
  AgentThinkingContent,
  AgentToolUseContent,
  ToolResult,
  ToolCall,
  ToolCallStatus,
  ToolCallKind,
  ToolCallUpdateFields,
  PermissionOption,
  RunningTurn,
  ProjectContext,
  ThreadOptions,
  ThreadSnapshot,
  PlanEntry,
  RetryStatus,
} from "./types";
import { MessageRole, ToolCallStatus as TCS } from "./types";

const MAX_RETRY_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 5000;
const TOOL_CANCELED_MESSAGE = "Tool canceled by user";
const MAX_SUBAGENT_DEPTH = 1;

export type ThreadEventListener = (event: ThreadEvent) => void;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionContext {
  sessionId: SessionId;
  abortSignal: AbortSignal;
  reportProgress?: (progress: ToolProgress) => void;
}

export interface ToolProgress {
  title?: string;
  content?: string;
}

export interface ToolExecutionResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface ModelProvider {
  name: string;
  complete: (
    request: ModelRequest,
  ) => AsyncIterable<ModelResponseEvent>;
}

export interface ModelRequest {
  system: string;
  messages: Array<{
    role: "user" | "assistant";
    content: Array<{
      type: string;
      text?: string;
      tool_use_id?: string;
      tool_name?: string;
      input?: Record<string, unknown>;
    }>;
  }>;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export type ModelResponseEvent =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string; signature?: string }
  | { type: "redacted_thinking"; data: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "stop"; reason: StopReason }
  | { type: "usage"; inputTokens: number; outputTokens: number; totalTokens: number }
  | { type: "error"; error: Error };

interface RunningTurnInternal {
  id: number;
  abortController: AbortController;
  promise: Promise<StopReason>;
}

export class Thread {
  private id: SessionId;
  private title?: string;
  private messages: Message[];
  private pendingMessage?: AgentMessage;
  private plan: PlanEntry[];
  private tools: Map<string, ToolDefinition>;
  private toolCallRegistry: Map<string, ToolCall>;
  private runningTurn?: RunningTurnInternal;
  private turnCounter = 0;
  private listeners: Set<ThreadEventListener>;
  private model?: ModelProvider;
  private systemPrompt: string;
  private projectContext: ProjectContext;
  private stopReason?: StopReason;
  private tokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  private retryAttempts = 0;
  private subagentDepth = 0;
  private thinkingEnabled = false;
  private thinkingEffort?: string;
  private profileId?: string;
  private createdAt: number;
  private updatedAt: number;

  constructor(options: ThreadOptions, systemPrompt: string) {
    this.id = options.sessionId;
    this.title = undefined;
    this.messages = [];
    this.plan = [];
    this.tools = new Map();
    this.toolCallRegistry = new Map();
    this.listeners = new Set();
    this.systemPrompt = systemPrompt;
    this.projectContext = options.projectContext;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    if (options.thinkingEnabled !== undefined) {
      this.thinkingEnabled = options.thinkingEnabled;
    }
    if (options.thinkingEffort) {
      this.thinkingEffort = options.thinkingEffort;
    }
    if (options.profileId) {
      this.profileId = options.profileId;
    }
  }

  get sessionId(): SessionId {
    return this.id;
  }

  get currentTitle(): string | undefined {
    return this.title;
  }

  get messagesSnapshot(): ReadonlyArray<Message> {
    return [...this.messages];
  }

  get currentPlan(): ReadonlyArray<PlanEntry> {
    return [...this.plan];
  }

  get availableTools(): ReadonlyArray<ToolDefinition> {
    return Array.from(this.tools.values());
  }

  get isRunning(): boolean {
    return this.runningTurn !== undefined;
  }

  get capabilities(): PromptCapabilities {
    return {
      image: false,
      web_search: false,
      document: true,
    };
  }

  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  on(listener: ThreadEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ThreadEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  async send(content: ContentBlock[]): Promise<StopReason> {
    const userMessageId = createUserMessageId();
    const userMessage: UserMessage = {
      id: userMessageId,
      role: MessageRole.User,
      content: content,
      timestamp: Date.now(),
    };

    this.messages.push(userMessage);
    this.updatedAt = Date.now();

    this.emit({
      kind: ThreadEventKind.UserMessage,
      id: userMessageId,
      content,
    });

    return this.runTurn();
  }

  async resume(): Promise<StopReason> {
    return this.runTurn();
  }

  cancel(): void {
    if (this.runningTurn) {
      this.runningTurn.abortController.abort();
    }
  }

  private async runTurn(): Promise<StopReason> {
    if (this.runningTurn) {
      throw new Error("A turn is already running");
    }

    if (!this.model) {
      throw new Error("No model configured");
    }

    const turnId = ++this.turnCounter;
    const abortController = new AbortController();

    const promise = this.executeTurn(abortController.signal).finally(() => {
      this.runningTurn = undefined;
    });

    this.runningTurn = {
      id: turnId,
      abortController,
      promise,
    };

    return promise;
  }

  private async executeTurn(signal: AbortSignal): Promise<StopReason> {
    this.pendingMessage = {
      role: MessageRole.Assistant,
      content: [],
      toolResults: new Map(),
    };

    let stopReason: StopReason | undefined;

    while (!stopReason && !signal.aborted) {
      const request = this.buildModelRequest();

      try {
        const response = this.model!.complete(request);

        for await (const event of response) {
          if (signal.aborted) {
            stopReason = StopReason.Cancelled;
            break;
          }

          switch (event.type) {
            case "text":
              this.handleAgentText(event.text);
              break;

            case "thinking":
              this.handleAgentThinking(event.text);
              break;

            case "redacted_thinking":
              this.handleRedactedThinking(event.data);
              break;

            case "tool_use":
              this.handleToolUse(event.id, event.name, event.input);
              break;

            case "stop":
              stopReason = event.reason;
              break;

            case "usage":
              this.tokenUsage = {
                inputTokens: event.inputTokens,
                outputTokens: event.outputTokens,
                totalTokens: event.totalTokens,
              };
              this.emit({
                kind: ThreadEventKind.TokenUsageUpdated,
                usage: {
                  maxTokens: 0,
                  usedTokens: event.totalTokens,
                  inputTokens: event.inputTokens,
                  outputTokens: event.outputTokens,
                },
              });
              break;

            case "error":
              await this.handleError(event.error, signal);
              break;
          }
        }
      } catch (error) {
        if (signal.aborted) {
          stopReason = StopReason.Cancelled;
        } else {
          await this.handleError(
            error instanceof Error ? error : new Error(String(error)),
            signal,
          );
        }
      }

      if (stopReason) {
        break;
      }

      if (this.pendingMessage?.toolResults.size === 0 && !this.hasPendingToolCalls()) {
        stopReason = StopReason.EndTurn;
        break;
      }

      if (this.hasPendingToolCalls()) {
        await this.executePendingToolCalls(signal);
      }
    }

    this.finalizeMessage(stopReason ?? StopReason.Cancelled);

    const finalReason = stopReason ?? StopReason.Cancelled;
    this.stopReason = finalReason;

    this.emit({
      kind: ThreadEventKind.Stop,
      reason: finalReason,
    });

    return finalReason;
  }

  private handleAgentText(text: string): void {
    if (!this.pendingMessage) return;

    const lastContent = this.pendingMessage.content.at(-1);
    if (lastContent?.type === "text") {
      lastContent.text += text;
    } else {
      const content: AgentTextContent = { type: "text", text };
      this.pendingMessage.content.push(content);
    }

    this.emit({ kind: ThreadEventKind.AgentText, text });
  }

  private handleAgentThinking(text: string): void {
    if (!this.pendingMessage) return;

    const lastContent = this.pendingMessage.content.at(-1);
    if (lastContent?.type === "thinking") {
      lastContent.text += text;
    } else {
      const content: AgentThinkingContent = { type: "thinking", text };
      this.pendingMessage.content.push(content);
    }

    this.emit({ kind: ThreadEventKind.AgentThinking, text });
  }

  private handleRedactedThinking(data: string): void {
    if (!this.pendingMessage) return;

    this.pendingMessage.content.push({
      type: "redacted_thinking",
      data,
    });
  }

  private handleToolUse(id: string, name: string, input: Record<string, unknown>): void {
    if (!this.pendingMessage) return;

    const tool = this.tools.get(name);
    const title = tool ? this.generateToolTitle(tool, input) : name;

    const toolCall: ToolCall = {
      id,
      name,
      title,
      kind: this.inferToolCallKind(name),
      status: TCS.Pending,
      input,
      locations: [],
      content: [],
    };

    this.toolCallRegistry.set(id, toolCall);

    this.pendingMessage.content.push({
      type: "tool_use",
      id,
      name,
      input,
    });

    this.emit({ kind: ThreadEventKind.ToolCall, toolCall });
  }

  private async executePendingToolCalls(signal: AbortSignal): Promise<void> {
    if (!this.pendingMessage) return;

    for (const content of this.pendingMessage.content) {
      if (content.type !== "tool_use" || signal.aborted) continue;

      const toolCall = this.toolCallRegistry.get(content.id);
      if (!toolCall) continue;

      const tool = this.tools.get(content.name);
      if (!tool) {
        this.pendingMessage.toolResults.set(content.id, {
          toolUseId: content.id,
          toolName: content.name,
          content: [{ type: "text", text: `Tool "${content.name}" not found` }],
          isError: true,
        });
        this.updateToolCallStatus(content.id, TCS.Failed);
        continue;
      }

      this.updateToolCallStatus(content.id, TCS.InProgress);

      try {
        const result = await tool.execute(
          content.input,
          {
            sessionId: this.id,
            abortSignal: signal,
            reportProgress: (progress) => {
              this.updateToolCallFields(content.id, {
                title: progress.title ?? toolCall.title,
              });
            },
          },
        );

        this.pendingMessage.toolResults.set(content.id, {
          toolUseId: content.id,
          toolName: content.name,
          content: result.content,
          isError: result.isError ?? false,
        });

        this.updateToolCallStatus(content.id, TCS.Completed);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.pendingMessage.toolResults.set(content.id, {
          toolUseId: content.id,
          toolName: content.name,
          content: [{ type: "text", text: errorMessage }],
          isError: true,
        });

        this.updateToolCallStatus(content.id, TCS.Failed);
      }
    }
  }

  private async handleError(error: Error, signal: AbortSignal): Promise<void> {
    if (this.retryAttempts < MAX_RETRY_ATTEMPTS && !signal.aborted) {
      this.retryAttempts++;

      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, this.retryAttempts - 1);
      const retryStatus: RetryStatus = {
        lastError: error.message,
        attempt: this.retryAttempts,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        startedAt: Date.now(),
        durationMs: delay,
      };

      this.emit({ kind: ThreadEventKind.Retry, status: retryStatus });

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, delay);
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });

      if (!signal.aborted) {
        return;
      }
    }

    this.emit({
      kind: ThreadEventKind.Error,
      error,
    });
  }

  private finalizeMessage(reason: StopReason): void {
    if (this.pendingMessage) {
      this.messages.push(this.pendingMessage);

      for (const content of this.pendingMessage.content) {
        if (content.type === "tool_use") {
          const toolCall = this.toolCallRegistry.get(content.id);
          if (toolCall && toolCall.status === TCS.Pending) {
            this.updateToolCallStatus(content.id, TCS.Canceled);
          }
        }
      }

      this.pendingMessage = undefined;
    }

    this.updatedAt = Date.now();
  }

  private buildModelRequest(): ModelRequest {
    const messages: Array<{
      role: "user" | "assistant";
      content: Array<{
        type: string;
        text?: string;
        tool_use_id?: string;
        tool_name?: string;
        input?: Record<string, unknown>;
      }>;
    }> = [];

    for (const msg of this.messages) {
      if (msg.role === MessageRole.User) {
        messages.push({
          role: "user",
          content: msg.content.map((c) => ({
            type: c.type,
            text: "text" in c ? c.text : undefined,
            uri: "uri" in c ? c.uri : undefined,
          })),
        });
      } else if (msg.role === MessageRole.Assistant) {
        const assistantContent: Array<{
          type: string;
          text?: string;
          tool_use_id?: string;
          tool_name?: string;
          input?: Record<string, unknown>;
        }> = [];

        for (const c of msg.content) {
          if (c.type === "text") {
            assistantContent.push({ type: "text", text: c.text });
          } else if (c.type === "thinking") {
            assistantContent.push({ type: "thinking", text: c.text, signature: c.signature });
          } else if (c.type === "tool_use") {
            assistantContent.push({
              type: "tool_use",
              tool_use_id: c.id,
              tool_name: c.name,
              input: c.input,
            });
          }
        }

        messages.push({ role: "assistant", content: assistantContent });

        for (const [toolUseId, result] of msg.toolResults) {
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseId,
                text: result.content
                  .filter((c) => c.type === "text")
                  .map((c) => c.text)
                  .join("\n"),
              },
            ],
          });
        }
      }
    }

    return {
      system: this.systemPrompt,
      messages,
      tools: this.enabledToolsSchema(),
    };
  }

  private enabledToolsSchema(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> | undefined {
    if (this.tools.size === 0) return undefined;

    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  private hasPendingToolCalls(): boolean {
    if (!this.pendingMessage) return false;

    return this.pendingMessage.content.some(
      (c) => c.type === "tool_use" && !this.pendingMessage!.toolResults.has(c.id),
    );
  }

  private updateToolCallStatus(id: string, status: ToolCallStatus): void {
    const toolCall = this.toolCallRegistry.get(id);
    if (toolCall) {
      toolCall.status = status;
      this.emit({
        kind: ThreadEventKind.ToolCallUpdate,
        toolCallId: id,
        fields: { status },
      });
    }
  }

  private updateToolCallFields(id: string, fields: ToolCallUpdateFields): void {
    const toolCall = this.toolCallRegistry.get(id);
    if (toolCall) {
      Object.assign(toolCall, fields);
      this.emit({
        kind: ThreadEventKind.ToolCallUpdate,
        toolCallId: id,
        fields,
      });
    }
  }

  private generateToolTitle(
    tool: ToolDefinition,
    input: Record<string, unknown>,
  ): string {
    if ("path" in input && typeof input.path === "string") {
      return `${tool.name}: ${input.path}`;
    }
    if ("command" in input && typeof input.command === "string") {
      return input.command.slice(0, 80);
    }
    return tool.name;
  }

  private inferToolCallKind(name: string): ToolCallKind {
    const readTools = ["read", "glob", "grep", "code_search", "fetch"];
    const executeTools = ["bash", "task", "install"];

    if (readTools.includes(name)) return ToolCallKind.Read;
    if (executeTools.includes(name)) return ToolCallKind.Execute;
    return ToolCallKind.Edit;
  }

  setModel(model: ModelProvider): void {
    this.model = model;
  }

  setTitle(title: string): void {
    this.title = title;
    this.emit({ kind: ThreadEventKind.TitleUpdated, title });
  }

  updatePlan(entries: PlanEntry[]): void {
    this.plan = entries;
    this.emit({ kind: ThreadEventKind.Plan, entries });
  }

  getSnapshot(): ThreadSnapshot {
    return {
      sessionId: this.id.value,
      title: this.title,
      messages: this.messages.map((msg) => this.serializeMessage(msg)),
      plan: [...this.plan],
      tokenUsage: {
        maxTokens: 0,
        usedTokens: this.tokenUsage.totalTokens,
        inputTokens: this.tokenUsage.inputTokens,
        outputTokens: this.tokenUsage.outputTokens,
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      profileId: this.profileId,
      thinkingEnabled: this.thinkingEnabled,
      thinkingEffort: this.thinkingEffort,
    };
  }

  private serializeMessage(msg: Message): any {
    if (msg.role === MessageRole.User) {
      return {
        role: "user",
        content: msg.content.map((c) => ({
          type: c.type,
          text: "text" in c ? c.text : undefined,
        })),
      };
    }

    const agentMsg = msg as AgentMessage;
    return {
      role: "assistant",
      content: agentMsg.content.map((c) => ({
        type: c.type,
        text: "text" in c ? c.text : undefined,
        id: "id" in c ? c.id : undefined,
        name: "name" in c ? c.name : undefined,
        input: "input" in c ? c.input : undefined,
      })),
      toolResults: Array.from(agentMsg.toolResults.values()).map((r) => ({
        toolUseId: r.toolUseId,
        toolName: r.toolName,
        content: r.content,
        isError: r.isError,
      })),
    };
  }
}
