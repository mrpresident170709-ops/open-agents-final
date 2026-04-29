export interface AgentInfo {
  name: string;
  description: string;
  mode: "primary" | "subagent" | "all";
  permission: PermissionRules;
  model?: {
    providerID: string;
    modelID: string;
  };
  prompt?: string;
  options: Record<string, unknown>;
  steps?: number;
  tools?: string[];
}

export type PermissionRules = Record<string, PermissionLevel>;

export type PermissionLevel = "allow" | "deny" | "ask";

export interface AgentExecuteOptions {
  sessionID: string;
  messageID: string;
  agent: string;
  messages: any[];
  abort: AbortSignal;
}

export interface AgentExecuteResult {
  output: string;
  metadata: Record<string, unknown>;
}

export interface AgentInterface {
  get(agent: string): AgentInfo;
  list(): AgentInfo[];
  defaultAgent(): string;
  execute(options: AgentExecuteOptions): Promise<AgentExecuteResult>;
}

export class AgentRegistry implements AgentInterface {
  private agents: Map<string, AgentInfo> = new Map();

  constructor() {
    this.registerDefaultAgents();
  }

  private registerDefaultAgents(): void {
    const agents: Record<string, AgentInfo> = {
      build: {
        name: "build",
        description: "The default agent. Executes tools based on configured permissions.",
        options: {},
        permission: {
          "*": "allow",
          doom_loop: "ask",
          question: "deny",
          plan_enter: "deny",
          plan_exit: "deny",
        },
        mode: "primary",
        tools: [],
      },
      plan: {
        name: "plan",
        description: "Plan mode. Disallows all edit tools.",
        options: {},
        permission: {
          "*": "allow",
          edit: "deny",
          write: "deny",
          question: "allow",
          plan_exit: "allow",
        },
        mode: "primary",
        tools: [],
      },
      explore: {
        name: "explore",
        description: "Fast agent specialized for exploring codebases. Use this when you need to quickly find files, search code, or answer questions about the codebase.",
        options: {},
        permission: {
          "*": "deny",
          grep: "allow",
          glob: "allow",
          list: "allow",
          read: "allow",
          webfetch: "allow",
          websearch: "allow",
        },
        mode: "subagent",
        tools: ["read", "glob", "grep", "list", "webfetch", "websearch"],
      },
      general: {
        name: "general",
        description: "General-purpose agent for researching complex questions and executing multi-step tasks.",
        options: {},
        permission: {
          "*": "allow",
          todowrite: "deny",
        },
        mode: "subagent",
        tools: ["read", "write", "edit", "bash", "glob", "grep"],
      },
      code: {
        name: "code",
        description: "Specialized agent for code generation, refactoring, and implementation tasks.",
        options: {},
        permission: { "*": "allow" },
        mode: "subagent",
        tools: ["read", "write", "edit", "bash", "glob", "grep", "node"],
      },
      review: {
        name: "review",
        description: "Specialized agent for code review, bug detection, and quality assessment.",
        options: {},
        permission: { "*": "allow", write: "deny", edit: "deny" },
        mode: "subagent",
        tools: ["read", "glob", "grep", "list"],
      },
      debug: {
        name: "debug",
        description: "Specialized agent for debugging, diagnosing issues, and finding root causes.",
        options: {},
        permission: { "*": "allow" },
        mode: "subagent",
        tools: ["read", "grep", "glob", "bash", "node"],
      },
      test: {
        name: "test",
        description: "Specialized agent for writing tests, test strategies, and test coverage.",
        options: {},
        permission: { "*": "allow" },
        mode: "subagent",
        tools: ["read", "write", "glob", "bash", "node"],
      },
      docs: {
        name: "docs",
        description: "Specialized agent for documentation generation, README creation, and API docs.",
        options: {},
        permission: { "*": "allow" },
        mode: "subagent",
        tools: ["read", "glob", "write"],
      },
      architect: {
        name: "architect",
        description: "Specialized agent for system design, architecture planning, and technical decisions.",
        options: {},
        permission: { "*": "allow", edit: "deny", write: "deny" },
        mode: "subagent",
        tools: ["read", "glob", "grep", "list", "websearch"],
      },
    };

    for (const [name, agent] of Object.entries(agents)) {
      this.agents.set(name, agent);
    }
  }

  get(agent: string): AgentInfo {
    return this.agents.get(agent) ?? this.agents.get("build")!;
  }

  list(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  defaultAgent(): string {
    return "build";
  }

  async execute(_options: AgentExecuteOptions): Promise<AgentExecuteResult> {
    return { output: "", metadata: {} };
  }

  register(name: string, agent: AgentInfo): void {
    this.agents.set(name, agent);
  }
}

export const globalAgentRegistry = new AgentRegistry();