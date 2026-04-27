const MCP_STDIO_TIMEOUT_MS = 60_000;

interface MCPToolResult {
  content: Array<{ type: string; text?: string; image?: string }>;
  isError?: boolean;
}

interface MCPConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

class MCPClient {
  private proc: ReturnType<typeof import("child_process").spawn> | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private initialized = false;

  constructor(private config: MCPConfig) {}

  async connect(): Promise<void> {
    if (this.proc) return;

    const { spawn } = await import("child_process");
    this.proc = spawn(this.config.command, this.config.args ?? [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.config.env },
    });

    this.proc.stdout?.on("data", (data: Buffer) => {
      this.handleMessage(data.toString());
    });

    this.proc.stderr?.on("data", (data: Buffer) => {
      console.error("[MCP stderr]", data.toString());
    });

    this.proc.on("exit", (code) => {
      console.log("[MCP process exited]", code);
      this.proc = null;
    });

    await this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
      },
      clientInfo: {
        name: "open-harness-agent",
        version: "1.0.0",
      },
    });

    this.initialized = true;
    this.sendNotification("initialized", {});
  }

  private handleMessage(data: string): void {
    const lines = data.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const msg = JSON.parse(line.slice(6));
        if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
          const { resolve, reject } = this.pendingRequests.get(msg.id)!;
          this.pendingRequests.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // Skip parse errors
      }
    }
  }

  private sendRequest<T>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.proc) throw new Error("MCP not connected");

      const id = ++this.requestId;
      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });

      const msg = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      this.proc.stdin?.write(msg + "\n");

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("MCP request timeout"));
        }
      }, MCP_STDIO_TIMEOUT_MS);
    });
  }

  private sendNotification(
    method: string,
    params: Record<string, unknown>,
  ): void {
    if (!this.proc) throw new Error("MCP not connected");

    const msg = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
    });

    this.proc.stdin?.write(msg + "\n");
  }

  async listTools(): Promise<
    Array<{ name: string; description: string; inputSchema: object }>
  > {
    const result = await this.sendRequest<{
      tools: Array<{ name: string; description: string; inputSchema: object }>;
    }>("tools/list", {});

    return result.tools ?? [];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const result = await this.sendRequest<MCPToolResult>("tools/call", {
      name,
      arguments: args,
    });

    return result;
  }

  async disconnect(): Promise<void> {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
    this.initialized = false;
  }
}

const mcpClients = new Map<string, MCPClient>();

export async function getMCPClient(
  serverName: string,
  config: MCPConfig,
): Promise<MCPClient> {
  if (mcpClients.has(serverName)) {
    return mcpClients.get(serverName)!;
  }

  const client = new MCPClient(config);
  await client.connect();
  mcpClients.set(serverName, client);
  return client;
}

export async function disconnectAllMCP(): Promise<void> {
  for (const client of mcpClients.values()) {
    await client.disconnect();
  }
  mcpClients.clear();
}
