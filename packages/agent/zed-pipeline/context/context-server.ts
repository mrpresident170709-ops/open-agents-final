export interface ContextServerId {
  readonly __brand: "ContextServerId";
  value: string;
}

export function createContextServerId(value: string): ContextServerId {
  return { __brand: "ContextServerId" as const, value };
}

export enum ContextServerStatus {
  Starting = "starting",
  Running = "running",
  Stopped = "stopped",
  Error = "error",
}

export interface ContextServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export interface ContextServerPrompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface ContextServerTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ContextServerRegistryEvent {
  type: "tools_changed" | "prompts_changed" | "status_changed";
  serverId: string;
}

export type ContextServerRegistryListener = (
  event: ContextServerRegistryEvent,
) => void;

export interface RegisteredServer {
  config: ContextServerConfig;
  status: ContextServerStatus;
  prompts: ContextServerPrompt[];
  tools: ContextServerTool[];
  error?: string;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
}

export class ContextServerRegistry {
  private servers: Map<string, RegisteredServer>;
  private listeners: Set<ContextServerRegistryListener>;

  constructor() {
    this.servers = new Map();
    this.listeners = new Set();
  }

  on(listener: ContextServerRegistryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ContextServerRegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  register(config: ContextServerConfig): void {
    this.servers.set(config.id, {
      config,
      status: ContextServerStatus.Stopped,
      prompts: [],
      tools: [],
    });

    this.emit({
      type: "status_changed",
      serverId: config.id,
    });
  }

  unregister(serverId: string): boolean {
    const existed = this.servers.has(serverId);
    this.servers.delete(serverId);

    if (existed) {
      this.emit({ type: "tools_changed", serverId });
      this.emit({ type: "prompts_changed", serverId });
    }

    return existed;
  }

  updateStatus(
    serverId: string,
    status: ContextServerStatus,
    error?: string,
  ): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.status = status;
    if (error) {
      server.error = error;
    }

    this.emit({ type: "status_changed", serverId });
  }

  updatePrompts(serverId: string, prompts: ContextServerPrompt[]): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.prompts = prompts;
    this.emit({ type: "prompts_changed", serverId });
  }

  updateTools(serverId: string, tools: ContextServerTool[]): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.tools = tools;
    this.emit({ type: "tools_changed", serverId });
  }

  getServer(serverId: string): RegisteredServer | undefined {
    return this.servers.get(serverId);
  }

  getServers(): ReadonlyArray<RegisteredServer> {
    return Array.from(this.servers.values());
  }

  getRunningServers(): ReadonlyArray<RegisteredServer> {
    return this.getServers().filter(
      (s) => s.status === ContextServerStatus.Running,
    );
  }

  getAllPrompts(): Array<{
    serverId: string;
    prompt: ContextServerPrompt;
  }> {
    const result: Array<{ serverId: string; prompt: ContextServerPrompt }> = [];

    for (const [serverId, server] of this.servers) {
      for (const prompt of server.prompts) {
        result.push({ serverId, prompt });
      }
    }

    return result;
  }

  getAllTools(): Array<{
    serverId: string;
    tool: ContextServerTool;
  }> {
    const result: Array<{ serverId: string; tool: ContextServerTool }> = [];

    for (const [serverId, server] of this.servers) {
      for (const tool of server.tools) {
        result.push({ serverId, tool });
      }
    }

    return result;
  }

  getPrompt(
    serverId: string,
    promptName: string,
  ): ContextServerPrompt | undefined {
    return this.servers
      .get(serverId)
      ?.prompts.find((p) => p.name === promptName);
  }

  getTool(serverId: string, toolName: string): ContextServerTool | undefined {
    return this.servers
      .get(serverId)
      ?.tools.find((t) => t.name === toolName);
  }

  hasServer(serverId: string): boolean {
    return this.servers.has(serverId);
  }
}
