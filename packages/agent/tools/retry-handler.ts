import { type ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ClassifiedError {
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  rateLimitDelayMs?: number;
  code?: string;
}

export function classifyError(error: unknown): ClassifiedError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("too many requests") ||
    lowerMessage.includes("429")
  ) {
    const delayMatch = message.match(/retry[- ]?after[- ]?(\d+)/i);
    const delayMs = delayMatch?.[1] ? parseInt(delayMatch[1], 10) * 1000 : undefined;
    return {
      message,
      severity: "medium",
      retryable: true,
      rateLimitDelayMs: delayMs,
      code: "RATE_LIMIT",
    };
  }

  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("etimedout") ||
    lowerMessage.includes("connection timed out")
  ) {
    return {
      message,
      severity: "medium",
      retryable: true,
      code: "TIMEOUT",
    };
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("dns") ||
    lowerMessage.includes("enotfound")
  ) {
    return {
      message,
      severity: "medium",
      retryable: true,
      code: "NETWORK",
    };
  }

  if (
    lowerMessage.includes("server error") ||
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("504")
  ) {
    return {
      message,
      severity: "high",
      retryable: true,
      code: "SERVER_ERROR",
    };
  }

  if (
    lowerMessage.includes("401") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("authentication failed")
  ) {
    return {
      message,
      severity: "critical",
      retryable: false,
      code: "AUTH",
    };
  }

  if (
    lowerMessage.includes("403") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("permission denied")
  ) {
    return {
      message,
      severity: "critical",
      retryable: false,
      code: "PERMISSION",
    };
  }

  if (
    lowerMessage.includes("not found") ||
    lowerMessage.includes("404") ||
    lowerMessage.includes("does not exist")
  ) {
    return {
      message,
      severity: "low",
      retryable: false,
      code: "NOT_FOUND",
    };
  }

  if (
    lowerMessage.includes("module not found") ||
    lowerMessage.includes("cannot find module") ||
    lowerMessage.includes("enosys")
  ) {
    return {
      message,
      severity: "medium",
      retryable: false,
      code: "MODULE",
    };
  }

  return {
    message,
    severity: "low",
    retryable: false,
    code: "UNKNOWN",
  };
}

export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
  rateLimitDelayMs?: number,
): number {
  if (rateLimitDelayMs) {
    return Math.min(rateLimitDelayMs, config.maxDelayMs);
  }

  const delay = config.baseDelayMs * config.backoffMultiplier ** attempt;
  return Math.min(delay, config.maxDelayMs);
}

export interface ToolExecutionContext {
  attempt: number;
  startTime: number;
  lastError?: ClassifiedError;
}

export function createExecutionContext(): ToolExecutionContext {
  return {
    attempt: 0,
    startTime: Date.now(),
  };
}

export function shouldRetry(
  ctx: ToolExecutionContext,
  config: RetryConfig,
): boolean {
  return ctx.attempt < config.maxRetries && ctx.lastError?.retryable === true;
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (error: ClassifiedError, attempt: number) => void | Promise<void>,
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const ctx = createExecutionContext();

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const classified = classifyError(error);
      ctx.lastError = classified;

      if (!shouldRetry(ctx, cfg)) {
        throw error;
      }

      if (onRetry) {
        await onRetry(classified, ctx.attempt);
      }

      ctx.attempt++;
      const delay = calculateRetryDelay(
        ctx.attempt,
        cfg,
        classified.rateLimitDelayMs,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export interface PlanningStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  dependencies: string[];
  result?: string;
  error?: string;
}

export interface Plan {
  id: string;
  title: string;
  steps: PlanningStep[];
  status: "planning" | "executing" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
}

export function createPlan(title: string, stepDescriptions: string[]): Plan {
  const now = Date.now();
  return {
    id: `plan-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    steps: stepDescriptions.map((description, i) => ({
      id: `step-${i}`,
      description,
      status: "pending" as const,
      dependencies: [],
    })),
    status: "planning",
    createdAt: now,
    updatedAt: now,
  };
}

export function topologicalSort(steps: PlanningStep[]): PlanningStep[] {
  const visited = new Set<string>();
  const result: PlanningStep[] = [];
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  function visit(step: PlanningStep) {
    if (visited.has(step.id)) return;
    visited.add(step.id);

    for (const depId of step.dependencies) {
      const dep = stepMap.get(depId);
      if (dep) visit(dep);
    }

    result.push(step);
  }

  for (const step of steps) {
    visit(step);
  }

  return result;
}

export function getExecutableSteps(plan: Plan): PlanningStep[] {
  const completed = new Set(
    plan.steps.filter((s) => s.status === "completed").map((s) => s.id),
  );

  return plan.steps.filter((step) => {
    if (step.status !== "pending") return false;
    return step.dependencies.every((depId) => completed.has(depId));
  });
}

export const retryTool = tool({
  description: `Retry a failed operation with exponential backoff.

USE WHEN:
- A previous tool call failed with a retryable error (network, timeout, rate limit)
- You want to automatically retry the operation without manual retry logic

INPUT:
- The operation to retry (re-run the same tool with the same arguments)
- Optional maxRetries (default: 3)
- Optional baseDelayMs (default: 1000)

The tool will automatically classify the error and determine if retry is appropriate.`,
  inputSchema: z.object({
    operation: z.string().describe("Description of the operation to retry"),
    maxRetries: z.number().min(1).max(10).optional(),
    baseDelayMs: z.number().min(100).max(60000).optional(),
  }),
  execute: async ({ operation, maxRetries, baseDelayMs }, context) => {
    return {
      success: false,
      error:
        "Retry tool is a placeholder - actual retry logic is built into each tool",
      hint: "Tools already have built-in retry logic. Use the original tool call again with adjusted parameters.",
    };
  },
});
