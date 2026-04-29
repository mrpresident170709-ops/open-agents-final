export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  subtasks?: TodoItem[];
  dependencies?: string[];
}

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TodoPriority = "high" | "medium" | "low";

export interface TodoUpdate {
  id: string;
  changes: Partial<Pick<TodoItem, "content" | "status" | "priority">>;
}

export class TodoManager {
  private todos: Map<string, TodoItem> = new Map();
  private listeners: Set<(todos: TodoItem[]) => void> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  add(content: string, priority: TodoPriority = "medium"): TodoItem {
    const todo: TodoItem = {
      id: this.generateId(),
      content,
      status: "pending",
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.todos.set(todo.id, todo);
    this.saveToStorage();
    this.notify();

    return todo;
  }

  addSubtask(parentId: string, content: string): TodoItem | null {
    const parent = this.todos.get(parentId);
    if (!parent) return null;

    if (!parent.subtasks) {
      parent.subtasks = [];
    }

    const subtask: TodoItem = {
      id: this.generateId(),
      content,
      status: "pending",
      priority: parent.priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    parent.subtasks.push(subtask);
    parent.updatedAt = Date.now();
    this.saveToStorage();
    this.notify();

    return subtask;
  }

  update(update: TodoUpdate): boolean {
    const todo = this.todos.get(update.id);
    if (!todo) return false;

    Object.assign(todo, update.changes);
    todo.updatedAt = Date.now();

    if (update.changes.status === "completed") {
      todo.completedAt = Date.now();
    }

    this.saveToStorage();
    this.notify();

    return true;
  }

  delete(id: string): boolean {
    const todo = this.todos.get(id);
    if (!todo) return false;

    if (todo.subtasks) {
      for (const subtask of todo.subtasks) {
        this.todos.delete(subtask.id);
      }
    }

    this.todos.delete(id);
    this.saveToStorage();
    this.notify();

    return true;
  }

  get(id: string): TodoItem | undefined {
    return this.todos.get(id);
  }

  getAll(): TodoItem[] {
    return Array.from(this.todos.values()).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.updatedAt - a.updatedAt;
    });
  }

  getByStatus(status: TodoStatus): TodoItem[] {
    return this.getAll().filter((t) => t.status === status);
  }

  getInProgress(): TodoItem | undefined {
    return this.getAll().find((t) => t.status === "in_progress");
  }

  getPending(): TodoItem[] {
    return this.getByStatus("pending");
  }

  getCompleted(): TodoItem[] {
    return this.getByStatus("completed");
  }

  start(id: string): boolean {
    const inProgress = this.getInProgress();
    if (inProgress && inProgress.id !== id) {
      this.update({ id: inProgress.id, changes: { status: "pending" } });
    }

    return this.update({ id, changes: { status: "in_progress" } });
  }

  complete(id: string): boolean {
    return this.update({ id, changes: { status: "completed" } });
  }

  cancel(id: string): boolean {
    return this.update({ id, changes: { status: "cancelled" } });
  }

  getStats(): TodoStats {
    const all = this.getAll();
    const pending = all.filter((t) => t.status === "pending").length;
    const inProgress = all.filter((t) => t.status === "in_progress").length;
    const completed = all.filter((t) => t.status === "completed").length;
    const cancelled = all.filter((t) => t.status === "cancelled").length;

    const highPriority = all.filter((t) => t.priority === "high").length;

    return {
      total: all.length,
      pending,
      inProgress,
      completed,
      cancelled,
      highPriority,
      completionRate: all.length > 0 ? completed / all.length : 0,
    };
  }

  on(listener: (todos: TodoItem[]) => void): () => void {
    const id = this.generateId();
    this.listeners.set(id, listener);
    return () => this.listeners.delete(id);
  }

  private notify(): void {
    const todos = this.getAll();
    for (const listener of this.listeners.values()) {
      try {
        listener(todos);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private generateId(): string {
    return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private saveToStorage(): void {
    try {
      const data = JSON.stringify(Array.from(this.todos.entries()));
      localStorage.setItem("opencode_todos", data);
    } catch {
      // Ignore storage errors
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem("opencode_todos");
      if (data) {
        const entries = JSON.parse(data) as [string, TodoItem][];
        for (const [id, todo] of entries) {
          this.todos.set(id, todo);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
}

export interface TodoStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  highPriority: number;
  completionRate: number;
}

export const globalTodoManager = new TodoManager();