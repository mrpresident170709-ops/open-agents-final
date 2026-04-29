import type { SessionId } from "../acp";
import type { Thread } from "../thread/thread";
import type { ThreadEvent, ThreadEventListener } from "../thread/types";

const MAX_SUBAGENT_DEPTH = 1;
const TOOL_CANCELED_MESSAGE = "Tool canceled by user";

export interface SubagentContext {
  parentSessionId: SessionId;
  depth: number;
}

export interface SubagentResult {
  sessionId: SessionId;
  output: string;
  stopReason: string;
  durationMs: number;
}

export interface SubagentSpawnOptions {
  label: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface SubagentHandle {
  id: SessionId;
  entryCount: number;
  send(message: string): Promise<string>;
  cancel(): void;
}

export type SubagentFactory = (
  label: string,
  parentContext: SubagentContext,
) => SubagentHandle;

export class SubagentManager {
  private activeSubagents: Map<string, SubagentHandle>;
  private parentContext: SubagentContext;
  private factory: SubagentFactory;

  constructor(
    parentSessionId: SessionId,
    factory: SubagentFactory,
    depth = 0,
  ) {
    this.activeSubagents = new Map();
    this.parentContext = {
      parentSessionId,
      depth,
    };
    this.factory = factory;
  }

  get canSpawnSubagent(): boolean {
    return this.parentContext.depth < MAX_SUBAGENT_DEPTH;
  }

  get currentDepth(): number {
    return this.parentContext.depth;
  }

  get activeCount(): number {
    return this.activeSubagents.size;
  }

  async spawn(options: SubagentSpawnOptions): Promise<SubagentResult> {
    if (!this.canSpawnSubagent) {
      throw new Error(
        `Maximum subagent depth (${MAX_SUBAGENT_DEPTH}) reached`,
      );
    }

    const handle = this.factory(options.label, this.parentContext);
    this.activeSubagents.set(handle.id.value, handle);

    const startTime = Date.now();
    let stopReason = "unknown";

    try {
      const output = await Promise.race([
        handle.send(options.prompt),
        options.timeoutMs
          ? new Promise<string>((_, reject) =>
              setTimeout(
                () => reject(new Error("Subagent timed out")),
                options.timeoutMs,
              ),
            )
          : new Promise<never>(() => {}),
      ]);

      stopReason = "end_turn";

      return {
        sessionId: handle.id,
        output,
        stopReason,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      stopReason = error instanceof Error ? error.message : "error";

      return {
        sessionId: handle.id,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        stopReason,
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.activeSubagents.delete(handle.id.value);
    }
  }

  cancelAll(): void {
    for (const handle of this.activeSubagents.values()) {
      handle.cancel();
    }
    this.activeSubagents.clear();
  }

  getActiveSessions(): ReadonlyArray<SessionId> {
    return Array.from(this.activeSubagents.values()).map((h) => h.id);
  }

  getSubagent(id: SessionId): SubagentHandle | undefined {
    return this.activeSubagents.get(id.value);
  }
}

export class ThreadSubagentHandle implements SubagentHandle {
  private thread: Thread;
  private events: ThreadEvent[];

  constructor(thread: Thread) {
    this.thread = thread;
    this.events = [];

    thread.on((event) => {
      this.events.push(event);
    });
  }

  get id(): SessionId {
    return this.thread.sessionId;
  }

  get entryCount(): number {
    return this.thread.messagesSnapshot.length;
  }

  async send(message: string): Promise<string> {
    const contentBlock = {
      type: "text" as const,
      text: message,
    };

    const stopReason = await this.thread.send([contentBlock]);

    const messages = this.thread.messagesSnapshot;
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistantMessage) {
      return "";
    }

    const textParts = lastAssistantMessage.content
      .filter((c) => c.type === "text")
      .map((c) => ("text" in c ? c.text : ""));

    return textParts.join("\n");
  }

  cancel(): void {
    this.thread.cancel();
  }
}

export function createSubagentFromThread(
  parentThread: Thread,
  systemPrompt: string,
): SubagentFactory {
  return (label: string, parentContext: SubagentContext): SubagentHandle => {
    const sessionId = {
      value: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    };

    const subagentContext = {
      worktrees: [],
      userRules: [],
    };

    const thread = new Thread(
      {
        sessionId,
        projectContext: subagentContext,
        profileId: `subagent-${label}`,
      },
      systemPrompt,
    );

    for (const tool of parentThread.availableTools) {
      thread.registerTool(tool);
    }

    return new ThreadSubagentHandle(thread);
  };
}
