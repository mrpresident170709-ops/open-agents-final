export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  embedding?: number[];
  importance: number;
  expiresAt?: number;
}

export const MEMORY_TYPES = [
  "conversation",
  "code_change",
  "error",
  "tool_use",
  "knowledge",
  "preference",
  "context",
] as const;

export type MemoryType = typeof MEMORY_TYPES[number];

export interface MemoryQuery {
  query: string;
  limit?: number;
  threshold?: number;
  types?: MemoryType[];
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  totalTokens: number;
}

export class MemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private byType: Map<MemoryType, Set<string>> = new Map();
  private maxMemories: number = 10000;
  private maxTokens: number = 1000000;

  constructor(options?: { maxMemories?: number; maxTokens?: number }) {
    if (options?.maxMemories) this.maxMemories = options.maxMemories;
    if (options?.maxTokens) this.maxTokens = options.maxTokens;

    for (const type of MEMORY_TYPES) {
      this.byType.set(type, new Set());
    }
  }

  add(entry: Omit<MemoryEntry, "id" | "timestamp">): MemoryEntry {
    const id = this.generateId();
    const fullEntry: MemoryEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
    };

    this.memories.set(id, fullEntry);
    this.byType.get(fullEntry.type)?.add(id);

    this.pruneIfNeeded();

    return fullEntry;
  }

  get(id: string): MemoryEntry | undefined {
    return this.memories.get(id);
  }

  getByType(type: MemoryType, limit?: number): MemoryEntry[] {
    const ids = this.byType.get(type) || new Set();
    const entries = Array.from(ids)
      .map((id) => this.memories.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    return limit ? entries.slice(0, limit) : entries;
  }

  query(options: MemoryQuery): MemoryEntry[] {
    const queryLower = options.query.toLowerCase();
    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const entry of this.memories.values()) {
      if (options.types && !options.types.includes(entry.type)) {
        continue;
      }

      if (entry.content.toLowerCase().includes(queryLower)) {
        let score = entry.importance;

        if (entry.content.toLowerCase() === queryLower) {
          score += 10;
        }

        const recencyBonus = Math.max(
          0,
          (Date.now() - entry.timestamp) / (1000 * 60 * 60),
        );
        score += Math.max(0, 5 - recencyBonus);

        results.push({ entry, score });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const limited = options.limit ? results.slice(0, options.limit) : results;
    return limited.map((r) => r.entry);
  }

  delete(id: string): boolean {
    const entry = this.memories.get(id);
    if (!entry) return false;

    this.memories.delete(id);
    this.byType.get(entry.type)?.delete(id);

    return true;
  }

  clear(type?: MemoryType): void {
    if (type) {
      const ids = this.byType.get(type) || new Set();
      for (const id of ids) {
        this.memories.delete(id);
      }
      this.byType.set(type, new Set());
    } else {
      this.memories.clear();
      for (const ids of this.byType.values()) {
        ids.clear();
      }
    }
  }

  getStats(): MemoryStats {
    const byType: Record<MemoryType, number> = {
      conversation: 0,
      code_change: 0,
      error: 0,
      tool_use: 0,
      knowledge: 0,
      preference: 0,
      context: 0,
    };

    for (const entry of this.memories.values()) {
      byType[entry.type]++;
    }

    return {
      totalEntries: this.memories.size,
      byType,
      totalTokens: this.estimateTokens(),
    };
  }

  private pruneIfNeeded(): void {
    if (this.memories.size <= this.maxMemories) return;

    const entries = Array.from(this.memories.values());
    entries.sort((a, b) => {
      const aScore = a.importance - (Date.now() - a.timestamp) / (1000 * 60 * 60 * 24);
      const bScore = b.importance - (Date.now() - b.timestamp) / (1000 * 60 * 60 * 24);
      return aScore - bScore;
    });

    const toRemove = this.memories.size - this.maxMemories;
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i].id);
    }
  }

  private estimateTokens(): number {
    let total = 0;
    for (const entry of this.memories.values()) {
      total += entry.content.split(" ").length;
    }
    return total;
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const globalMemory = new MemoryStore();