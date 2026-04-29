export enum ToolCallLifecycleStatus {
  Pending = "pending",
  WaitingForConfirmation = "waiting_for_confirmation",
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
  Rejected = "rejected",
  Canceled = "canceled",
}

export interface ToolCallLifecycleEvent {
  toolCallId: string;
  from: ToolCallLifecycleStatus;
  to: ToolCallLifecycleStatus;
  timestamp: number;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  title: string;
  status: ToolCallLifecycleStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  locations: ToolCallLocation[];
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ToolCallLocation {
  path: string;
  line?: number;
  range?: { start: number; end: number };
}

export const STATUS_TRANSITIONS: Record<
  ToolCallLifecycleStatus,
  ToolCallLifecycleStatus[]
> = {
  [ToolCallLifecycleStatus.Pending]: [
    ToolCallLifecycleStatus.WaitingForConfirmation,
    ToolCallLifecycleStatus.InProgress,
    ToolCallLifecycleStatus.Canceled,
  ],
  [ToolCallLifecycleStatus.WaitingForConfirmation]: [
    ToolCallLifecycleStatus.InProgress,
    ToolCallLifecycleStatus.Rejected,
    ToolCallLifecycleStatus.Canceled,
  ],
  [ToolCallLifecycleStatus.InProgress]: [
    ToolCallLifecycleStatus.Completed,
    ToolCallLifecycleStatus.Failed,
    ToolCallLifecycleStatus.Canceled,
  ],
  [ToolCallLifecycleStatus.Completed]: [],
  [ToolCallLifecycleStatus.Failed]: [],
  [ToolCallLifecycleStatus.Rejected]: [],
  [ToolCallLifecycleStatus.Canceled]: [],
};

export class ToolCallLifecycleManager {
  private registry: Map<string, ToolCallRecord>;
  private eventHistory: ToolCallLifecycleEvent[];

  constructor() {
    this.registry = new Map();
    this.eventHistory = [];
  }

  register(call: {
    id: string;
    name: string;
    title: string;
    input: Record<string, unknown>;
    locations?: ToolCallLocation[];
  }): ToolCallRecord {
    const now = Date.now();
    const record: ToolCallRecord = {
      id: call.id,
      name: call.name,
      title: call.title,
      status: ToolCallLifecycleStatus.Pending,
      input: call.input,
      locations: call.locations ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.registry.set(call.id, record);
    return record;
  }

  transition(
    toolCallId: string,
    newStatus: ToolCallLifecycleStatus,
  ): ToolCallLifecycleEvent {
    const record = this.registry.get(toolCallId);
    if (!record) {
      throw new Error(`Tool call "${toolCallId}" not found`);
    }

    const allowedTransitions = STATUS_TRANSITIONS[record.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${record.status} -> ${newStatus}`,
      );
    }

    const event: ToolCallLifecycleEvent = {
      toolCallId,
      from: record.status,
      to: newStatus,
      timestamp: Date.now(),
    };

    record.status = newStatus;
    record.updatedAt = Date.now();

    if (newStatus === ToolCallLifecycleStatus.InProgress && !record.startedAt) {
      record.startedAt = Date.now();
    }

    if (
      newStatus === ToolCallLifecycleStatus.Completed ||
      newStatus === ToolCallLifecycleStatus.Failed ||
      newStatus === ToolCallLifecycleStatus.Rejected ||
      newStatus === ToolCallLifecycleStatus.Canceled
    ) {
      record.completedAt = Date.now();
    }

    this.eventHistory.push(event);
    return event;
  }

  complete(toolCallId: string, output: Record<string, unknown>): void {
    const record = this.registry.get(toolCallId);
    if (!record) {
      throw new Error(`Tool call "${toolCallId}" not found`);
    }

    record.output = output;
    this.transition(toolCallId, ToolCallLifecycleStatus.Completed);
  }

  fail(toolCallId: string, error: string): void {
    const record = this.registry.get(toolCallId);
    if (!record) {
      throw new Error(`Tool call "${toolCallId}" not found`);
    }

    record.error = error;
    this.transition(toolCallId, ToolCallLifecycleStatus.Failed);
  }

  cancel(toolCallId: string): void {
    this.transition(toolCallId, ToolCallLifecycleStatus.Canceled);
  }

  get(toolCallId: string): ToolCallRecord | undefined {
    return this.registry.get(toolCallId);
  }

  getAll(): ReadonlyArray<ToolCallRecord> {
    return Array.from(this.registry.values());
  }

  getActive(): ReadonlyArray<ToolCallRecord> {
    return this.getAll().filter(
      (r) =>
        r.status === ToolCallLifecycleStatus.Pending ||
        r.status === ToolCallLifecycleStatus.WaitingForConfirmation ||
        r.status === ToolCallLifecycleStatus.InProgress,
    );
  }

  getCompleted(): ReadonlyArray<ToolCallRecord> {
    return this.getAll().filter(
      (r) => r.status === ToolCallLifecycleStatus.Completed,
    );
  }

  getEvents(toolCallId?: string): ReadonlyArray<ToolCallLifecycleEvent> {
    if (toolCallId) {
      return this.eventHistory.filter((e) => e.toolCallId === toolCallId);
    }
    return [...this.eventHistory];
  }

  getDuration(toolCallId: string): number | undefined {
    const record = this.registry.get(toolCallId);
    if (!record || !record.startedAt || !record.completedAt) {
      return undefined;
    }
    return record.completedAt - record.startedAt;
  }

  clear(): void {
    this.registry.clear();
    this.eventHistory = [];
  }
}
