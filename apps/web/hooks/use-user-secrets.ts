"use client";

import { useCallback, useEffect, useState } from "react";

export interface SecretEntry {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function useUserSecrets() {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/secrets");
      if (!res.ok) throw new Error("Failed to load secrets");
      const data = (await res.json()) as { secrets: SecretEntry[] };
      setSecrets(data.secrets);
    } catch {
      setError("Failed to load secrets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addSecret = useCallback(
    async (name: string, value: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, value }),
        });
        const data = (await res.json()) as { secret?: SecretEntry; error?: string };
        if (!res.ok) return { error: data.error ?? "Failed to save secret" };
        await load();
        return {};
      } catch {
        return { error: "Network error" };
      }
    },
    [load],
  );

  const deleteSecret = useCallback(
    async (name: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/secrets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          return { error: data.error ?? "Failed to delete secret" };
        }
        setSecrets((prev) => prev.filter((s) => s.name !== name));
        return {};
      } catch {
        return { error: "Network error" };
      }
    },
    [],
  );

  return { secrets, isLoading, error, addSecret, deleteSecret, reload: load };
}
