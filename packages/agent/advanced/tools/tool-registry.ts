export interface ToolContext {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
  callID?: string;
  extra?: Record<string, unknown>;
  messages: any[];
  metadata?(input: { title?: string; metadata?: Record<string, unknown> }): void;
  ask?(input: { prompt: string; level: string }): void;
}

export interface ToolResult {
  title: string;
  metadata: Record<string, unknown>;
  output: string;
  attachments?: any[];
}

export interface ToolDefinition<P = any> {
  id: string;
  description: string;
  parameters: any;
  execute(args: P, ctx: ToolContext): Promise<ToolResult>;
  formatValidationError?(error: unknown): string;
}

export interface ToolInfo<P = any> {
  id: string;
  description: string;
  init: () => Promise<ToolDefinition<P>>;
}

export class ToolRegistry {
  private tools: Map<string, ToolInfo<any>> = new Map();

  register<P = any>(id: string, info: ToolInfo<P>): void {
    if (this.tools.has(id)) {
      throw new Error(`Tool "${id}" already registered`);
    }
    this.tools.set(id, info);
  }

  get<P = any>(id: string): ToolInfo<P> | undefined {
    return this.tools.get(id) as ToolInfo<P>;
  }

  getAll(): Map<string, ToolInfo<any>> {
    return new Map(this.tools);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  async execute(id: string, args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const toolInfo = this.tools.get(id);
    if (!toolInfo) {
      throw new Error(`Tool "${id}" not found`);
    }

    const tool = await toolInfo.init();
    return tool.execute(args as any, ctx);
  }
}

export const globalToolRegistry = new ToolRegistry();

export function defineTool<P = any>(
  id: string,
  description: string,
  init: () => Promise<Omit<ToolDefinition<P>, "id">,
): ToolInfo<P> {
  return {
    id,
    description,
    init: async () => {
      const tool = await init();
      return { ...tool, id };
    },
  };
}

export function createToolContext(params: {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
  messages: any[];
}): ToolContext {
  return {
    sessionID: params.sessionID,
    messageID: params.messageID,
    agent: params.agent,
    abort: params.abort,
    messages: params.messages,
    metadata: () => undefined,
    ask: () => undefined,
  };
}