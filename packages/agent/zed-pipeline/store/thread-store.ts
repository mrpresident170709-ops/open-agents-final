import type { SessionId } from "../acp";
import type { ThreadSnapshot } from "../thread/types";
import type { Thread } from "../thread/thread";

export interface ThreadStoreConfig {
  storage: ThreadStorage;
}

export interface ThreadStorage {
  save(threadId: string, snapshot: ThreadSnapshot): Promise<void>;
  load(threadId: string): Promise<ThreadSnapshot | null>;
  list(): Promise<ThreadMetadata[]>;
  delete(threadId: string): Promise<void>;
}

export interface ThreadMetadata {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  model?: string;
}

export type ThreadStoreListener = (event: ThreadStoreEvent) => void;

export type ThreadStoreEvent =
  | { type: "thread_saved"; threadId: string }
  | { type: "thread_loaded"; threadId: string }
  | { type: "thread_deleted"; threadId: string }
  | { type: "threads_list_changed" };

export class ThreadStore {
  private storage: ThreadStorage;
  private listeners: Set<ThreadStoreListener>;
  private cache: Map<string, ThreadSnapshot>;

  constructor(config: ThreadStoreConfig) {
    this.storage = config.storage;
    this.listeners = new Set();
    this.cache = new Map();
  }

  on(listener: ThreadStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ThreadStoreEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  async save(thread: Thread): Promise<void> {
    const snapshot = thread.getSnapshot();

    await this.storage.save(snapshot.sessionId, snapshot);
    this.cache.set(snapshot.sessionId, snapshot);

    this.emit({ type: "thread_saved", threadId: snapshot.sessionId });
  }

  async saveSnapshot(snapshot: ThreadSnapshot): Promise<void> {
    await this.storage.save(snapshot.sessionId, snapshot);
    this.cache.set(snapshot.sessionId, snapshot);

    this.emit({ type: "thread_saved", threadId: snapshot.sessionId });
  }

  async load(threadId: string): Promise<ThreadSnapshot | null> {
    if (this.cache.has(threadId)) {
      const cached = this.cache.get(threadId)!;
      this.emit({ type: "thread_loaded", threadId });
      return cached;
    }

    const snapshot = await this.storage.load(threadId);
    if (snapshot) {
      this.cache.set(threadId, snapshot);
      this.emit({ type: "thread_loaded", threadId });
    }

    return snapshot;
  }

  async list(): Promise<ThreadMetadata[]> {
    return this.storage.list();
  }

  async delete(threadId: string): Promise<void> {
    await this.storage.delete(threadId);
    this.cache.delete(threadId);

    this.emit({ type: "thread_deleted", threadId });
    this.emit({ type: "threads_list_changed" });
  }

  clearCache(): void {
    this.cache.clear();
  }

  getFromCache(threadId: string): ThreadSnapshot | undefined {
    return this.cache.get(threadId);
  }
}

export class MemoryStorage implements ThreadStorage {
  private store: Map<string, ThreadSnapshot>;

  constructor() {
    this.store = new Map();
  }

  async save(threadId: string, snapshot: ThreadSnapshot): Promise<void> {
    this.store.set(threadId, snapshot);
  }

  async load(threadId: string): Promise<ThreadSnapshot | null> {
    return this.store.get(threadId) ?? null;
  }

  async list(): Promise<ThreadMetadata[]> {
    return Array.from(this.store.values()).map((s) => ({
      id: s.sessionId,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      model: s.model,
    }));
  }

  async delete(threadId: string): Promise<void> {
    this.store.delete(threadId);
  }
}

export function createJsonFileStorage(basePath: string): ThreadStorage {
  return {
    async save(threadId: string, snapshot: ThreadSnapshot): Promise<void> {
      const fs = await import("fs");
      const path = await import("path");

      const filePath = path.join(basePath, `${threadId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    },

    async load(threadId: string): Promise<ThreadSnapshot | null> {
      const fs = await import("fs");
      const path = await import("path");

      const filePath = path.join(basePath, `${threadId}.json`);
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(content) as ThreadSnapshot;
      } catch {
        return null;
      }
    },

    async list(): Promise<ThreadMetadata[]> {
      const fs = await import("fs");
      const path = await import("path");

      try {
        const files = await fs.promises.readdir(basePath);
        const metadata: ThreadMetadata[] = [];

        for (const file of files) {
          if (!file.endsWith(".json")) continue;

          const filePath = path.join(basePath, file);
          try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const snapshot = JSON.parse(content) as ThreadSnapshot;
            metadata.push({
              id: snapshot.sessionId,
              title: snapshot.title,
              createdAt: snapshot.createdAt,
              updatedAt: snapshot.updatedAt,
              model: snapshot.model,
            });
          } catch {
            continue;
          }
        }

        return metadata.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch {
        return [];
      }
    },

    async delete(threadId: string): Promise<void> {
      const fs = await import("fs");
      const path = await import("path");

      const filePath = path.join(basePath, `${threadId}.json`);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // File doesn't exist, ignore
      }
    },
  };
}
