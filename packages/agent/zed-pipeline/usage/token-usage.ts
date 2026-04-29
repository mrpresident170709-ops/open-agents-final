export interface TokenUsage {
  maxTokens: number;
  usedTokens: number;
  inputTokens: number;
  outputTokens: number;
  maxOutputTokens?: number;
}

export interface TokenUsageRatio {
  ratio: number;
  status: "normal" | "warning" | "exceeded";
}

export interface SessionCost {
  amount: number;
  currency: string;
}

export const TOKEN_USAGE_WARNING_THRESHOLD = 0.8;

export function calculateTokenUsageRatio(usage: TokenUsage): TokenUsageRatio {
  if (usage.maxTokens === 0) {
    return { ratio: 0, status: "normal" };
  }

  const ratio = usage.usedTokens / usage.maxTokens;

  if (ratio >= 1) {
    return { ratio, status: "exceeded" };
  }

  if (ratio >= TOKEN_USAGE_WARNING_THRESHOLD) {
    return { ratio, status: "warning" };
  }

  return { ratio, status: "normal" };
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

export function estimateCost(
  usage: TokenUsage,
  inputCostPerMillion: number,
  outputCostPerMillion: number,
): SessionCost {
  const inputCost = (usage.inputTokens / 1_000_000) * inputCostPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * outputCostPerMillion;

  return {
    amount: inputCost + outputCost,
    currency: "USD",
  };
}

export interface ModelPricing {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  maxTokens: number;
  maxOutputTokens?: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-20250514": {
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
    maxTokens: 200000,
    maxOutputTokens: 8192,
  },
  "claude-opus-4-20250514": {
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
    maxTokens: 200000,
    maxOutputTokens: 8192,
  },
  "claude-3-5-sonnet-20241022": {
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
    maxTokens: 200000,
    maxOutputTokens: 8192,
  },
  "gpt-4o": {
    inputCostPerMillion: 2.5,
    outputCostPerMillion: 10.0,
    maxTokens: 128000,
    maxOutputTokens: 16384,
  },
  "gpt-4o-mini": {
    inputCostPerMillion: 0.15,
    outputCostPerMillion: 0.6,
    maxTokens: 128000,
    maxOutputTokens: 16384,
  },
  "o1": {
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 60.0,
    maxTokens: 200000,
    maxOutputTokens: 100000,
  },
  "o1-mini": {
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 12.0,
    maxTokens: 128000,
    maxOutputTokens: 65536,
  },
};

export function getModelPricing(modelId: string): ModelPricing | undefined {
  return MODEL_PRICING[modelId];
}

export function createTokenUsage(
  maxTokens: number,
  inputTokens = 0,
  outputTokens = 0,
): TokenUsage {
  return {
    maxTokens,
    usedTokens: inputTokens + outputTokens,
    inputTokens,
    outputTokens,
  };
}

export function addTokenUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    maxTokens: Math.max(a.maxTokens, b.maxTokens),
    usedTokens: a.usedTokens + b.usedTokens,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    maxOutputTokens:
      a.maxOutputTokens !== undefined || b.maxOutputTokens !== undefined
        ? Math.max(a.maxOutputTokens ?? 0, b.maxOutputTokens ?? 0)
        : undefined,
  };
}
