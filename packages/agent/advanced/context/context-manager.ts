export interface ProjectContext {
  rootPath: string;
  worktrees: WorktreeContext[];
  rules: ProjectRule[];
  language: string;
  packageManager: PackageManager;
}

export interface WorktreeContext {
  rootName: string;
  rootPath: string;
  files: FileContext[];
  gitBranch?: string;
  gitStatus?: GitStatus;
}

export interface FileContext {
  path: string;
  language: string;
  size: number;
  modifiedAt: number;
  imports?: string[];
  exports?: string[];
}

export interface ProjectRule {
  id: string;
  name: string;
  content: string;
  source: "global" | "project" | "user";
  priority: number;
}

export interface GitStatus {
  modified: string[];
  staged: string[];
  untracked: string[];
  conflicted: string[];
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "cargo" | "go" | "python";

export interface ContextProvider {
  name: string;
  priority: number;
  provide(context: ContextRequest): Promise<ContextResponse>;
}

export interface ContextRequest {
  project: ProjectContext;
  currentFiles: string[];
  recentChanges: string[];
  cursor?: CursorContext;
}

export interface ContextResponse {
  content: string;
  tokens: number;
  sources: string[];
}

export interface CursorContext {
  file: string;
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export class ContextManager {
  private project: ProjectContext | null = null;
  private providers: Map<string, ContextProvider> = new Map();
  private recentContext: ContextResponse[] = [];

  setProject(context: ProjectContext): void {
    this.project = context;
  }

  getProject(): ProjectContext | null {
    return this.project;
  }

  registerProvider(provider: ContextProvider): void {
    this.providers.set(provider.name, provider);
  }

  async getContext(request: Partial<ContextRequest>): Promise<string> {
    if (!this.project) {
      return "";
    }

    const fullRequest: ContextRequest = {
      project: this.project,
      currentFiles: request.currentFiles || [],
      recentChanges: request.recentChanges || [],
      cursor: request.cursor,
    };

    const responses: string[] = [];

    const sortedProviders = Array.from(this.providers.values()).sort(
      (a, b) => b.priority - a.priority,
    );

    for (const provider of sortedProviders) {
      try {
        const response = await provider.provide(fullRequest);
        responses.push(response.content);
        this.recentContext.push(response);

        if (this.recentContext.length > 10) {
          this.recentContext.shift();
        }
      } catch (error) {
        console.error(`Context provider "${provider.name}" failed:`, error);
      }
    }

    return responses.join("\n\n");
  }

  getRecentContexts(): ContextResponse[] {
    return [...this.recentContext];
  }

  clear(): void {
    this.recentContext = [];
  }
}

export class FileContextProvider implements ContextProvider {
  name = "file_context";
  priority = 10;

  async provide(request: ContextRequest): Promise<ContextResponse> {
    const parts: string[] = [];

    parts.push("## Project Structure\n");
    for (const worktree of request.project.worktrees) {
      parts.push(`- ${worktree.rootName}: ${worktree.rootPath}`);
    }

    parts.push("\n## Package Manager\n");
    parts.push(`- ${request.project.packageManager}`);

    if (request.project.rules.length > 0) {
      parts.push("\n## Project Rules\n");
      for (const rule of request.project.rules) {
        parts.push(`### ${rule.name}\n${rule.content}`);
      }
    }

    const content = parts.join("\n");
    return {
      content,
      tokens: content.split(" ").length,
      sources: ["file_context"],
    };
  }
}

export class RecentFilesProvider implements ContextProvider {
  name = "recent_files";
  priority = 5;

  async provide(request: ContextRequest): Promise<ContextResponse> {
    if (request.recentChanges.length === 0) {
      return { content: "", tokens: 0, sources: [] };
    }

    const parts: string[] = ["## Recently Modified Files\n"];
    for (const file of request.recentChanges.slice(0, 10)) {
      parts.push(`- ${file}`);
    }

    const content = parts.join("\n");
    return {
      content,
      tokens: content.split(" ").length,
      sources: ["recent_files"],
    };
  }
}

export class CursorContextProvider implements ContextProvider {
  name = "cursor_context";
  priority = 20;

  async provide(request: ContextRequest): Promise<ContextResponse> {
    if (!request.cursor) {
      return { content: "", tokens: 0, sources: [] };
    }

    const parts: string[] = ["## Current Cursor\n"];
    parts.push(`- File: ${request.cursor.file}`);
    parts.push(`- Line: ${request.cursor.line}, Column: ${request.cursor.column}`);

    if (request.cursor.selection) {
      parts.push(
        `- Selection: ${request.cursor.selection.start.line}:${request.cursor.selection.start.column} to ${request.cursor.selection.end.line}:${request.cursor.selection.end.column}`,
      );
    }

    const content = parts.join("\n");
    return {
      content,
      tokens: content.split(" ").length,
      sources: ["cursor_context"],
    };
  }
}

export const globalContextManager = new ContextManager();

globalContextManager.registerProvider(new FileContextProvider());
globalContextManager.registerProvider(new RecentFilesProvider());
globalContextManager.registerProvider(new CursorContextProvider());