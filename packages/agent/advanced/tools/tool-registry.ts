import { Effect, Schema } from "effect";
import type { MessageV2 } from "../session/message-v2";
import type { PermissionLevel } from "./agent-registry";
import type { SessionID, MessageID } from "../session/schema";

export interface ToolContext {
  sessionID: SessionID;
  messageID: MessageID;
  agent: string;
  abort: AbortSignal;
  callID?: string;
  extra?: Record<string, unknown>;
  messages: MessageV2.WithParts[];
  metadata(input: { title?: string; metadata?: Record<string, unknown> }): Effect.Effect<void>;
  ask(input: { prompt: string; level: PermissionLevel }): Effect.Effect<void>;
}

export interface ToolResult {
  title: string;
  metadata: Record<string, unknown>;
  output: string;
  attachments?: Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">[];
}

export interface ToolDefinition<P extends Schema.Decoder<unknown> = Schema.Decoder<unknown>> {
  id: string;
  description: string;
  parameters: P;
  execute(args: Schema.Schema.Type<P>, ctx: ToolContext): Effect.Effect<ToolResult>;
  formatValidationError?(error: unknown): string;
}

export interface ToolInfo<P extends Schema.Decoder<unknown> = Schema.Decoder<unknown>> {
  id: string;
  init: () => Effect.Effect<ToolDefinition<P>>;
}

export class ToolRegistry {
  private tools: Map<string, ToolInfo<any>> = new Map();

  register<P extends Schema.Decoder<unknown>>(
    id: string,
    info: ToolInfo<P>,
  ): void {
    if (this.tools.has(id)) {
      throw new Error(`Tool "${id}" already registered`);
    }
    this.tools.set(id, info);
  }

  get(id: string): ToolInfo<any> | undefined {
    return this.tools.get(id);
  }

  getAll(): Map<string, ToolInfo<any>> {
    return new Map(this.tools);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  async execute(
    id: string,
    args: unknown,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const toolInfo = this.tools.get(id);
    if (!toolInfo) {
      throw new Error(`Tool "${id}" not found`);
    }

    const tool = await toolInfo.init().pipe(Effect.runPromise);
    const decoded = await Schema.decodeUnknownEffect(tool.parameters)(args).pipe(
      Effect.mapError((error) =>
        tool.formatValidationError
          ? new Error(tool.formatValidationError(error), { cause: error })
          : new Error(
              `The ${id} tool was called with invalid arguments: ${error}`,
              { cause: error },
            ),
      ),
      Effect.runPromise,
    );

    return tool.execute(decoded as any, ctx).pipe(Effect.runPromise);
  }
}

export const globalToolRegistry = new ToolRegistry();

export function defineTool<P extends Schema.Decoder<unknown>>(
  id: string,
  init: () => Effect.Effect<Omit<ToolDefinition<P>, "id">>,
): ToolInfo<P> {
  return {
    id,
    init: () =>
      Effect.gen(function* () {
        const tool = yield* init();
        return { ...tool, id };
      }),
  };
}

export function createToolContext(params: {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
  messages: MessageV2.WithParts[];
}): ToolContext {
  return {
    sessionID: params.sessionID as SessionID,
    messageID: params.messageID as MessageID,
    agent: params.agent,
    abort: params.abort,
    messages: params.messages,
    metadata: () => Effect.succeed(undefined),
    ask: () => Effect.succeed(undefined),
  };
}