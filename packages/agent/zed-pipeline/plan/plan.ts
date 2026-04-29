export enum PlanEntryPriority {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum PlanEntryStatus {
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
}

export interface PlanEntry {
  content: string;
  priority: PlanEntryPriority;
  status: PlanEntryStatus;
}

export interface PlanStats {
  inProgressEntry?: PlanEntry;
  pending: number;
  completed: number;
  total: number;
}

export interface PlanUpdate {
  entries: PlanEntry[];
}

export type PlanListener = (plan: ReadonlyArray<PlanEntry>) => void;

export class PlanManager {
  private entries: PlanEntry[];
  private listeners: Set<PlanListener>;

  constructor() {
    this.entries = [];
    this.listeners = new Set();
  }

  get currentPlan(): ReadonlyArray<PlanEntry> {
    return [...this.entries];
  }

  get isEmpty(): boolean {
    return this.entries.length === 0;
  }

  on(listener: PlanListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.entries);
      } catch {
        // Ignore listener errors
      }
    }
  }

  update(entries: PlanEntry[]): void {
    this.entries = entries;
    this.emit();
  }

  addEntry(entry: PlanEntry): void {
    this.entries.push(entry);
    this.emit();
  }

  updateEntry(
    index: number,
    updates: Partial<Pick<PlanEntry, "content" | "priority" | "status">>,
  ): void {
    if (index < 0 || index >= this.entries.length) {
      throw new Error(`Plan entry index ${index} out of bounds`);
    }

    this.entries[index] = { ...this.entries[index], ...updates };
    this.emit();
  }

  markCompleted(index: number): void {
    this.updateEntry(index, { status: PlanEntryStatus.Completed });
  }

  markInProgress(index: number): void {
    for (let i = 0; i < this.entries.length; i++) {
      if (i !== index && this.entries[i].status === PlanEntryStatus.InProgress) {
        this.entries[i] = {
          ...this.entries[i],
          status: PlanEntryStatus.Pending,
        };
      }
    }

    this.updateEntry(index, { status: PlanEntryStatus.InProgress });
  }

  markAllCompleted(): void {
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].status !== PlanEntryStatus.Completed) {
        this.entries[i] = {
          ...this.entries[i],
          status: PlanEntryStatus.Completed,
        };
      }
    }
    this.emit();
  }

  getStats(): PlanStats {
    let pending = 0;
    let completed = 0;
    let inProgressEntry: PlanEntry | undefined;

    for (const entry of this.entries) {
      switch (entry.status) {
        case PlanEntryStatus.Pending:
          pending++;
          break;
        case PlanEntryStatus.InProgress:
          inProgressEntry = entry;
          pending++;
          break;
        case PlanEntryStatus.Completed:
          completed++;
          break;
      }
    }

    return {
      inProgressEntry,
      pending,
      completed,
      total: this.entries.length,
    };
  }

  getInProgressIndex(): number {
    return this.entries.findIndex(
      (e) => e.status === PlanEntryStatus.InProgress,
    );
  }

  getNextPendingIndex(): number {
    return this.entries.findIndex((e) => e.status === PlanEntryStatus.Pending);
  }

  hasInProgress(): boolean {
    return this.entries.some(
      (e) => e.status === PlanEntryStatus.InProgress,
    );
  }

  allCompleted(): boolean {
    return (
      this.entries.length > 0 &&
      this.entries.every((e) => e.status === PlanEntryStatus.Completed)
    );
  }

  clear(): void {
    this.entries = [];
    this.emit();
  }
}
