// Daytona SDK Types and Minimal Client
// This module provides type definitions and a minimal client

export interface DaytonaConfig {
  apiKey?: string;
  apiUrl?: string;
  target?: string;
}

export interface FileSystem {
  readFile(path: string): Promise<string>;
  uploadFile(content: Buffer, path: string): Promise<void>;
  stat(path: string): Promise<any>;
  access(path: string): Promise<void>;
  createFolder(path: string, mode: string): Promise<void>;
  listFiles(path: string): Promise<Array<{ name: string; isDirectory: boolean }>>;
}

export interface Process {
  executeCommand(
    command: string,
    cwd?: string,
    env?: Record<string, string>,
    timeout?: number,
  ): Promise<ExecuteResponse>;
}

export interface Git {
}

export interface Sandbox {
  id: string;
  name: string;
  fs: FileSystem;
  process: Process;
  git: Git;
  getPreviewLink(port: number): string | null;
  stop(): Promise<void>;
  setAutoStopInterval(seconds: number): Promise<void>;
  _experimental_createSnapshot(name: string): Promise<void>;
}

export interface ExecuteResponse {
  exitCode: number;
  result?: string;
}

export class Daytona {
  private config: DaytonaConfig;

  constructor(config?: DaytonaConfig) {
    this.config = config || {};
  }

  async create(params?: any): Promise<Sandbox> {
    const apiKey = this.config.apiKey || process.env.DAYTONA_API_KEY;
    const apiUrl = this.config.apiUrl || process.env.DAYTONA_API_URL || "https://app.daytona.io/api";

    console.log("Daytona: Creating sandbox", { 
      apiUrl: apiUrl?.substring(0, 30), 
      hasKey: !!apiKey,
      keyPrefix: apiKey?.substring(0, 10) 
    });

    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY is required. Set it in environment or pass to Daytona constructor.");
    }

    const response = await fetch(`${apiUrl}/sandbox`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Daytona API error:", response.status, text);
      throw new Error(`Failed to create Daytona sandbox: ${response.status} - ${text}`);
    }

    const data = (await response.json()) as any;
    console.log("Daytona: Created sandbox", data.id);
    return this.wrapSandbox(data);
  }

  async get(sandboxIdOrName: string): Promise<Sandbox> {
    const apiKey = this.config.apiKey || process.env.DAYTONA_API_KEY;
    const apiUrl = this.config.apiUrl || process.env.DAYTONA_API_URL || "https://app.daytona.io/api";

    const response = await fetch(`${apiUrl}/sandbox/${sandboxIdOrName}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get sandbox: ${response.status}`);
    }

    const data = await response.json();
    return this.wrapSandbox(data);
  }

  private wrapSandbox(data: any): Sandbox {
    const sandboxId = data.id || data.sandboxId;
    const baseUrl = this.config.apiUrl || process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
    const apiKey = this.config.apiKey || process.env.DAYTONA_API_KEY;

    return {
      id: sandboxId,
      name: data.name || sandboxId,
      fs: {
        readFile: async (path: string) => {
          const res = await fetch(`${baseUrl}/sandbox/${sandboxId}/fs/read`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          });
          const resData = (await res.json()) as any;
          return resData.content;
        },
        uploadFile: async () => { throw new Error("Not implemented"); },
        stat: async () => { throw new Error("Not implemented"); },
        access: async () => { throw new Error("Not implemented"); },
        createFolder: async () => { throw new Error("Not implemented"); },
        listFiles: async () => { throw new Error("Not implemented"); },
      },
      process: {
        executeCommand: async (command: string, cwd?: string, env?: Record<string, string>, timeout?: number) => {
          const res = await fetch(`${baseUrl}/sandbox/${sandboxId}/process`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ command, cwd, env, timeout }),
          });
          const processData = (await res.json()) as any;
          return { exitCode: processData.exitCode ?? 1, result: processData.stdout };
        },
      },
      git: {},
      getPreviewLink: (port: number) => `https://${sandboxId}-${port}.daytona.app`,
      stop: async () => {
        await fetch(`${baseUrl}/sandbox/${sandboxId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
      },
      setAutoStopInterval: async () => {},
      _experimental_createSnapshot: async () => { throw new Error("Not implemented"); },
    };
  }
}
