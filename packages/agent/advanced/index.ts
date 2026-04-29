export * from "./runtime/agent-registry";
export * from "./tools";
export * from "./subagents/subagent-manager";
export * from "./memory/memory-store";
export * from "./context/context-manager";
export * from "./abilities/ability-registry";
export * from "./orchestration/orchestrator";
export * from "./orchestration/todo-manager";
export * from "./ui/chat-state";

import { registerAllTools } from "./tools";

registerAllTools();

export interface AdvancedAgentConfig {
  projectPath: string;
  model: any;
  maxIterations?: number;
  maxTokens?: number;
  timeout?: number;
}

export class AdvancedAgent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async chat(input: string, options?: {
    agent?: string;
    stream?: boolean;
    onChunk?: (chunk: string) => void;
    onToolCall?: (tool: string, input: any) => void;
  }): Promise<string> {
    return "";
  }

  getTools() {
    return [];
  }

  getSubagents() {
    return [];
  }
}