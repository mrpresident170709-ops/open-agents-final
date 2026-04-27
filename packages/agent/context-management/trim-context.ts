import type { ModelMessage } from "ai";
import {
  indexToolCalls,
  findPendingCompactionCandidates,
  getPendingCompactionUnits,
  compactToolData,
} from "./aggressive-compaction-helpers";

const COMPACTED_NOTICE = "[content omitted — already processed by the agent]";

/**
 * Keeps the most recent `keepRecentCount` tool-call/result pairs at full
 * fidelity and replaces everything older with a short placeholder.
 *
 * This mirrors what Cursor and Lovable do: only the active working context
 * stays in the prompt; historical read/bash outputs that were already acted
 * upon are collapsed to save tokens and reduce noise.
 *
 * The operation is idempotent — already-compacted entries are never
 * double-compacted.
 *
 * @param messages  The full conversation history.
 * @param keepRecentCount  How many recent tool calls to keep at full size.
 *                         Default: 10.
 */
export function trimContext(
  messages: ModelMessage[],
  { keepRecentCount = 10 }: { keepRecentCount?: number } = {},
): ModelMessage[] {
  const toolCallIndex = indexToolCalls(messages);
  const allKeys = toolCallIndex.orderedKeys;

  if (allKeys.length <= keepRecentCount) {
    return messages;
  }

  const recentKeys = new Set(allKeys.slice(-keepRecentCount));

  const pendingCandidates = findPendingCompactionCandidates({
    messages,
    toolCallIndex,
    recentToolCallKeys: recentKeys,
    compactedToolNotice: COMPACTED_NOTICE,
  });

  if (getPendingCompactionUnits(pendingCandidates) === 0) {
    return messages;
  }

  return compactToolData({
    messages,
    toolCallIndex,
    pendingCandidates,
    compactedToolNotice: COMPACTED_NOTICE,
  });
}
