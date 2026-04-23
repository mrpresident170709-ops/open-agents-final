// Daytona SDK Types and Minimal Client
// This module provides type definitions and a minimal client
// that can work without installing the full @daytona/sdk package

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
  // Git operations interface
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

    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY is required. Set it in environment or pass to Daytona constructor.");
    }

    // Create sandbox via API
    const response = await fetch(`${apiUrl}/sandbox`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: params?.language || "typescript",
        envVars: params?.envVars || {},
        name: params?.name,
        snapshot: params?.snapshot,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create Daytona sandbox: ${response.status} ${text}`);
    }

    const data = await response.json();
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
    const sandboxName = data.name || data.sandboxName;
    const apiKey = this.config.apiKey || process.env.DAYTONA_API_KEY;
    const apiUrl = this.config.apiUrl || process.env.DAYTONA_API_URL || "https://app.daytona.io/api";

    // Create a proxy sandbox object that uses the API
    const sandbox: Sandbox = {
      id: sandboxId,
      name: sandboxName,
      fs: this.createFileSystem(sandboxId, apiKey, apiUrl),
      process: this.createProcess(sandboxId, apiKey, apiUrl),
      git: {} as Git,
      getPreviewLink: (port: number) => {
        return `https://${sandboxId}-${port}.daytona.app`;
      },
      stop: async () => {
        await fetch(`${apiUrl}/sandbox/${sandboxId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
      },
      setAutoStopInterval: async (seconds: number) => {
        await fetch(`${apiUrl}/sandbox/${sandboxId}/autostop`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ interval: seconds }),
        });
      },
      _experimental_createSnapshot: async (name: string) => {
        await fetch(`${apiUrl}/sandbox/${sandboxId}/snapshot`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        });
      },
    };

    return sandbox;
  }

  private createFileSystem(sandboxId: string, apiKey: string, apiUrl: string): FileSystem {
    return {
      readFile: async (path: string) => {
        const response = await fetch(
          `${apiUrl}/toolbox/${sandboxId}/file?path=${encodeURIComponent(path)}`,
          { headers: { "Authorization": `Bearer ${apiKey}` } },
        );
        if (!response.ok) throw new Error(`Failed to read file: ${response.status}`);
        return response.text();
      },
      uploadFile: async (content: Buffer, path: string) => {
        const formData = new FormData();
        formData.append("file", new Blob([content]), path.split("/").pop()!);
        formData.append("path", path);
        await fetch(`${apiUrl}/toolbox/${sandboxId}/file`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}` },
          body: formData,
        });
      },
      stat: async (path: string) => {
        const response = await fetch(
          `${apiUrl}/toolbox/${sandboxId}/file/stat?path=${encodeURIComponent(path)}`,
          { headers: { "Authorization": `Bearer ${apiKey}` } },
        );
        return response.json();
      },
      access: async (path: string) => {
        const response = await fetch(
          `${apiUrl}/toolbox/${sandboxId}/file/access?path=${encodeURIComponent(path)}`,
          { headers: { "Authorization": `Bearer ${apiKey}` } },
        );
        if (!response.ok) throw new Error(`File not accessible: ${path}`);
      },
      createFolder: async (path: string, mode: string) => {
        await fetch(`${apiUrl}/toolbox/${sandboxId}/folder`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path, mode }),
        });
      },
      listFiles: async (path: string) => {
        const response = await fetch(
          `${apiUrl}/toolbox/${sandboxId}/files?path=${encodeURIComponent(path)}`,
          { headers: { "Authorization": `Bearer ${apiKey}` } },
        );
        return response.json();
      },
    };
  }

  private createProcess(sandboxId: string, apiKey: string, apiUrl: string): Process {
    return {
      executeCommand: async (command: string, cwd?: string, env?: Record<string, string>, timeout?: number) => {
        const response = await fetch(`${apiUrl}/toolbox/${sandboxId}/process/execute`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            command,
            cwd,
            env,
            timeout,
          }),
        });
        return response.json();
      },
    };
  }
}
