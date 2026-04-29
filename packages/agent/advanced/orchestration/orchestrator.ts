import { Effect, Schema } from "effect";
import type { AgentInfo } from "./runtime/agent-registry";
import type { ToolContext } from "./tools/tool-registry";
import { globalToolRegistry } from "./tools";
import { SubagentManager } from "./subagents/subagent-manager";
import { globalMemory } from "./memory/memory-store";
import { globalContextManager } from "./context/context-manager";
import { globalAbilityRegistry } from "./abilities/ability-registry";

export interface OrchestrationRequest {
  sessionId: string;
  messageId: string;
  input: string;
  agent: AgentInfo;
  model: LanguageModelAdapter;
  context: OrchestrationContext;
}

export interface OrchestrationContext {
  projectPath: string;
  files: string[];
  currentFile?: string;
  selection?: string;
}

export interface OrchestrationResult {
  response: string;
  toolCalls: ToolCallResult[];
  subagentResults: SubagentResult[];
  tokens: TokenUsage;
  stopReason: StopReason;
}

export interface ToolCallResult {
  tool: string;
  input: Record<string, unknown>;
  result: string;
  duration: number;
  success: boolean;
}

export interface SubagentResult {
  subagent: string;
  input: string;
  output: string;
  duration: number;
  success: boolean;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export type StopReason =
  | "stop"
  | "tool_calls"
  | "max_tokens"
  | "error"
  | "cancelled"
  | "timeout";

export interface LanguageModelAdapter {
  complete(request: LLMRequest): AsyncIterable<LLMResponse>;
}

export interface LLMRequest {
  system: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMResponse {
  type: "content" | "tool_use" | "stop" | "error";
  content?: string;
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  stopReason?: StopReason;
  error?: string;
}

export class Orchestrator {
  private subagentManager: SubagentManager;
  private maxIterations: number = 100;
  private maxTokensPerRequest: number = 100000;

  constructor() {
    this.subagentManager = new SubagentManager();
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const toolCalls: ToolCallResult[] = [];
    const subagentResults: SubagentResult[] = [];
    let inputTokens = 0;
    let outputTokens = 0;

    const messages: LLMMessage[] = [
      { role: "system", content: request.agent.prompt || "" },
      { role: "user", content: request.input },
    ];

    const toolDefinitions = this.buildToolDefinitions(request.agent.tools);
    let iteration = 0;
    let stopReason: StopReason = "stop";

    while (iteration < this.maxIterations) {
      iteration++;

      const llmRequest: LLMRequest = {
        system: this.buildSystemPrompt(request),
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
      };

      let responseContent = "";
      let hasToolCalls = false;

      for await (const response of request.model.complete(llmRequest)) {
        if (response.type === "content" && response.content) {
          responseContent += response.content;
        }

        if (response.type === "tool_use" && response.toolUse) {
          hasToolCalls = true;

          const toolResult = await this.executeTool(
            response.toolUse.name,
            response.toolUse.input,
            request,
          );

          toolCalls.push({
            tool: response.toolUse.name,
            input: response.toolUse.input,
            result: toolResult.output,
            duration: 100,
            success: !toolResult.metadata?.error,
          });

          globalMemory.add({
            type: "tool_use",
            content: `Tool: ${response.toolUse.name}\nInput: ${JSON.stringify(response.toolUse.input)}\nOutput: ${toolResult.output}`,
            metadata: {
              tool: response.toolUse.name,
              success: !toolResult.metadata?.error,
            },
            importance: 5,
          });

          messages.push({
            role: "assistant",
            content: `[Tool: ${response.toolUse.name}]`,
          });
          messages.push({
            role: "user",
            content: toolResult.output,
          });
        }

        if (response.type === "stop") {
          stopReason = response.stopReason || "stop";
          break;
        }

        if (response.type === "error") {
          stopReason = "error";
          responseContent += `\n\nError: ${response.error}`;
          break;
        }
      }

      if (!hasToolCalls || stopReason !== "tool_calls") {
        break;
      }

      if (iteration >= this.maxIterations) {
        stopReason = "max_tokens";
      }
    }

    return {
      response: messages
        .filter((m) => m.role === "assistant")
        .pop()?.content || "",
      toolCalls,
      subagentResults,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      stopReason,
    };
  }

  private buildSystemPrompt(request: OrchestrationRequest): string {
    const parts: string[] = [
      request.agent.prompt || "",
      "",
      "## Available Tools",
      this.getToolDescriptions(request.agent.tools).join("\n"),
    ];

    const context = globalContextManager.getProject();
    if (context) {
      parts.push("", "## Project Context");
      parts.push(`- Root: ${context.rootPath}`);
      parts.push(`- Package Manager: ${context.packageManager}`);
    }

    return parts.join("\n");
  }

  private buildToolDefinitions(toolNames: string[]): LLMTool[] {
    const tools: LLMTool[] = [];

    for (const name of toolNames) {
      const info = globalToolRegistry.get(name);
      if (info) {
        tools.push({
          name: info.id,
          description: "",
          parameters: {},
        });
      }
    }

    return tools;
  }

  private getToolDescriptions(toolNames: string[]): string[] {
    return toolNames.map((name) => `- ${name}`);
  }

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    request: OrchestrationRequest,
  ): Promise<{ output: string; metadata?: Record<string, unknown> }> {
    try {
      const ctx: ToolContext = {
        sessionID: request.sessionId as any,
        messageID: request.messageId as any,
        agent: request.agent.name,
        abort: new AbortController().signal,
        messages: [],
        metadata: () => Effect.succeed(undefined),
        ask: () => Effect.succeed(undefined),
      };

      const result = await globalToolRegistry.execute(toolName, input, ctx);
      return { output: result.output, metadata: result.metadata };
    } catch (error) {
      return {
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true },
      };
    }
  }
}

export const globalOrchestrator = new Orchestrator();