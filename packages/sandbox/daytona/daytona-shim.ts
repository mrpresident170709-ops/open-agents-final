// Minimal Daytona client implementation
// This provides the interface needed without installing the full @daytona/sdk package

export interface DaytonaConfig {
  apiKey?: string;
  apiUrl?: string;
  target?: string;
}

export interface Sandbox {
  id: string;
  name: string;
  fs: FileSystem;
  process: Process;
  git: Git;
  getPreviewLink(port: number): string;
  stop(): Promise<void>;
  _experimental_createSnapshot(name: string): Promise<void>;
  setAutoStopInterval(seconds: number): Promise<void>;
}

export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(content: Buffer, path: string): Promise<void>;
  stat(path: string): Promise<any>;
  access(path: string): Promise<void>;
  createFolder(path: string, mode: string): Promise<void>;
  listFiles(path: string): Promise<Array<{ name: string; isDirectory: boolean }>>;
}

export interface Process {
  executeCommand(command: string, cwd?: string, env?: Record<string, string>, timeout?: number): Promise<ExecuteResponse>;
}

export interface Git {
  // Git operations
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
    // In a real implementation, this would call the Daytona API
    throw new Error("Daytona SDK not fully installed. Please install @daytona/sdk manually.");
  }

  async get(sandboxIdOrName: string): Promise<Sandbox> {
    throw new Error("Daytona SDK not fully installed. Please install @daytona/sdk manually.");
  }
}
