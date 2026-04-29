export interface SubagentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  maxIterations?: number;
  timeout?: number;
  model?: string;
}

export interface SubagentExecutionResult {
  success: boolean;
  output: string;
  iterations: number;
  duration: number;
  error?: string;
}

export interface SubagentContext {
  parentSessionId: string;
  depth: number;
  maxDepth: number;
}

export type SubagentExecutor = (
  config: SubagentConfig,
  input: string,
  context: SubagentContext,
) => Promise<SubagentExecutionResult>;

export class SubagentManager {
  private subagents: Map<string, SubagentConfig> = new Map();
  private activeSubagents: Map<string, AbortController> = new Map();
  private executor?: SubagentExecutor;

  constructor(executor?: SubagentExecutor) {
    this.executor = executor;
    this.registerDefaultSubagents();
  }

  private registerDefaultSubagents(): void {
    this.register({
      name: "explore",
      description:
        "Fast agent specialized for exploring codebases. Use this when you need to quickly find files, search code, or answer questions about the codebase.",
      systemPrompt: `You are an exploration agent specialized in quickly finding and analyzing code.

Your job is to:
1. Find files matching patterns using glob
2. Search for specific code patterns using grep
3. Read and analyze file contents
4. Provide concise, accurate answers about the codebase

Be thorough but efficient. Use parallel tool calls when possible.`,
      tools: ["glob", "grep", "read", "list", "websearch"],
      maxIterations: 10,
    });

    this.register({
      name: "code",
      description:
        "Specialized agent for code generation, refactoring, and implementation tasks.",
      systemPrompt: `You are a code generation agent specialized in writing high-quality code.

Your job is to:
1. Understand the requirements and specifications
2. Write clean, well-structured code
3. Follow best practices and coding conventions
4. Handle edge cases and error conditions
5. Write tests for your implementation

Use the edit and write tools to make changes. Always ensure code compiles and runs correctly.`,
      tools: ["read", "edit", "write", "glob", "grep", "bash"],
      maxIterations: 50,
    });

    this.register({
      name: "review",
      description:
        "Specialized agent for code review, bug detection, and quality assessment.",
      systemPrompt: `You are a code review agent specialized in analyzing code quality and finding bugs.

Your job is to:
1. Read and analyze code thoroughly
2. Identify potential bugs and issues
3. Check for code quality and best practices
4. Look for security vulnerabilities
5. Provide constructive feedback

Do NOT modify code - only analyze and report issues.`,
      tools: ["read", "grep", "glob", "list"],
      maxIterations: 20,
    });

    this.register({
      name: "debug",
      description:
        "Specialized agent for debugging, diagnosing issues, and finding root causes.",
      systemPrompt: `You are a debugging agent specialized in diagnosing and fixing issues.

Your job is to:
1. Understand the error or issue description
2. Search for relevant code that might cause the issue
3. Analyze the problem and identify root cause
4. Propose and implement fixes
5. Verify the fix works

Use systematic approach: reproduce, locate, fix, verify.`,
      tools: ["read", "grep", "glob", "bash"],
      maxIterations: 30,
    });

    this.register({
      name: "test",
      description:
        "Specialized agent for writing tests, test strategies, and test coverage.",
      systemPrompt: `You are a testing agent specialized in writing comprehensive tests.

Your job is to:
1. Understand what needs to be tested
2. Write unit tests, integration tests, or e2e tests
3. Ensure good test coverage
4. Follow testing best practices
5. Make tests maintainable and readable

Write tests that are reliable, fast, and provide good coverage.`,
      tools: ["read", "write", "glob", "bash"],
      maxIterations: 40,
    });

    this.register({
      name: "docs",
      description:
        "Specialized agent for documentation generation, README creation, and API docs.",
      systemPrompt: `You are a documentation agent specialized in creating clear, helpful documentation.

Your job is to:
1. Understand the code or feature being documented
2. Write clear, concise documentation
3. Include examples where helpful
4. Follow documentation best practices
5. Keep documentation up-to-date

Create documentation that is easy to understand and helpful for users.`,
      tools: ["read", "glob", "write"],
      maxIterations: 20,
    });

    this.register({
      name: "architect",
      description:
        "Specialized agent for system design, architecture planning, and technical decisions.",
      systemPrompt: `You are an architecture agent specialized in system design and planning.

Your job is to:
1. Understand the requirements and constraints
2. Design scalable, maintainable solutions
3. Consider trade-offs and alternatives
4. Provide clear explanations of design decisions
5. Create diagrams or documentation as needed

Focus on practical, implementable designs.`,
      tools: ["read", "glob", "grep", "list", "websearch"],
      maxIterations: 15,
    });
  }

  register(config: SubagentConfig): void {
    if (this.subagents.has(config.name)) {
      throw new Error(`Subagent "${config.name}" already registered`);
    }
    this.subagents.set(config.name, config);
  }

  get(name: string): SubagentConfig | undefined {
    return this.subagents.get(name);
  }

  getAll(): Map<string, SubagentConfig> {
    return new Map(this.subagents);
  }

  list(): { name: string; description: string }[] {
    return Array.from(this.subagents.values()).map((s) => ({
      name: s.name,
      description: s.description,
    }));
  }

  async execute(
    name: string,
    input: string,
    context: SubagentContext,
  ): Promise<SubagentExecutionResult> {
    const subagent = this.subagents.get(name);
    if (!subagent) {
      return {
        success: false,
        output: `Subagent "${name}" not found`,
        iterations: 0,
        duration: 0,
        error: "Subagent not found",
      };
    }

    if (context.depth >= context.maxDepth) {
      return {
        success: false,
        output: `Maximum subagent depth (${context.maxDepth}) reached`,
        iterations: 0,
        duration: 0,
        error: "Max depth reached",
      };
    }

    if (this.executor) {
      return this.executor(subagent, input, context);
    }

    return {
      success: true,
      output: `[Simulated] Would execute subagent "${name}" with input: ${input.slice(0, 100)}...`,
      iterations: 1,
      duration: 100,
    };
  }

  cancel(sessionId: string): void {
    const controller = this.activeSubagents.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeSubagents.delete(sessionId);
    }
  }

  cancelAll(): void {
    for (const controller of this.activeSubagents.values()) {
      controller.abort();
    }
    this.activeSubagents.clear();
  }
}