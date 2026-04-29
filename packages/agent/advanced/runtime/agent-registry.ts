import { Effect, Context, Layer, Schema } from "effect";
import type { SessionID, MessageID } from "./schema";
import type { MessageV2 } from "./message-v2";

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
}

export type PermissionRules = Record<string, PermissionLevel>;

export type PermissionLevel = "allow" | "deny" | "ask";

export interface AgentExecuteOptions {
  sessionID: SessionID;
  messageID: MessageID;
  agent: string;
  messages: MessageV2.WithParts[];
  abort: AbortSignal;
}

export interface AgentExecuteResult {
  output: string;
  metadata: Record<string, unknown>;
}

export interface AgentInterface {
  get(agent: string): Effect.Effect<AgentInfo>;
  list(): Effect.Effect<AgentInfo[]>;
  defaultAgent(): Effect.Effect<string>;
  execute(options: AgentExecuteOptions): Effect.Effect<AgentExecuteResult>;
}

export class AgentService extends Context.Service<AgentService, AgentInterface>()(
  "@opencode/Agent",
) {}

export const AgentLayer = Layer.effect(
  AgentService,
  Effect.gen(function* () {
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
      },
      explore: {
        name: "explore",
        description:
          "Fast agent specialized for exploring codebases. Use this when you need to quickly find files, search code, or answer questions about the codebase.",
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
      },
      general: {
        name: "general",
        description:
          "General-purpose agent for researching complex questions and executing multi-step tasks.",
        options: {},
        permission: {
          "*": "allow",
          todowrite: "deny",
        },
        mode: "subagent",
      },
      code: {
        name: "code",
        description:
          "Specialized agent for code generation, refactoring, and implementation tasks.",
        options: {},
        permission: {
          "*": "allow",
        },
        mode: "subagent",
      },
      review: {
        name: "review",
        description:
          "Specialized agent for code review, bug detection, and quality assessment.",
        options: {},
        permission: {
          "*": "allow",
          write: "deny",
          edit: "deny",
        },
        mode: "subagent",
      },
      debug: {
        name: "debug",
        description:
          "Specialized agent for debugging, diagnosing issues, and finding root causes.",
        options: {},
        permission: {
          "*": "allow",
        },
        mode: "subagent",
      },
      test: {
        name: "test",
        description:
          "Specialized agent for writing tests, test strategies, and test coverage.",
        options: {},
        permission: {
          "*": "allow",
        },
        mode: "subagent",
      },
      docs: {
        name: "docs",
        description:
          "Specialized agent for documentation generation, README creation, and API docs.",
        options: {},
        permission: {
          "*": "allow",
        },
        mode: "subagent",
      },
      architect: {
        name: "architect",
        description:
          "Specialized agent for system design, architecture planning, and technical decisions.",
        options: {},
        permission: {
          "*": "allow",
          edit: "deny",
          write: "deny",
        },
        mode: "subagent",
      },
    };

    return {
      get: (agent: string) => Effect.succeed(agents[agent] ?? agents.build),
      list: () => Effect.succeed(Object.values(agents)),
      defaultAgent: () => Effect.succeed("build"),
      execute: (_options: AgentExecuteOptions) =>
        Effect.succeed({ output: "", metadata: {} }),
    };
  }),
);