"use client";

import { useCallback, useEffect, useState } from "react";

export const SECRET_ENVIRONMENTS = ["all", "development", "preview", "production"] as const;
export type SecretEnvironment = (typeof SECRET_ENVIRONMENTS)[number];

export interface SecretEntry {
  id: string;
  name: string;
  environment: SecretEnvironment;
  createdAt: string;
  updatedAt: string;
}

export const ENV_LABELS: Record<SecretEnvironment, string> = {
  all: "All Environments",
  development: "Development",
  preview: "Preview",
  production: "Production",
};

export const ENV_BADGE_COLORS: Record<SecretEnvironment, string> = {
  all: "bg-muted text-muted-foreground",
  development: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  preview: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  production: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export function useUserSecrets(environmentFilter?: SecretEnvironment) {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = environmentFilter
        ? `/api/secrets?environment=${environmentFilter}`
        : "/api/secrets";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load secrets");
      const data = (await res.json()) as { secrets: SecretEntry[] };
      setSecrets(data.secrets);
    } catch {
      setError("Failed to load secrets");
    } finally {
      setIsLoading(false);
    }
  }, [environmentFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const addSecret = useCallback(
    async (
      name: string,
      value: string,
      environment: SecretEnvironment = "all",
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, value, environment }),
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
    async (
      name: string,
      environment: SecretEnvironment = "all",
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/secrets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, environment }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          return { error: data.error ?? "Failed to delete secret" };
        }
        setSecrets((prev) =>
          prev.filter((s) => !(s.name === name && s.environment === environment)),
        );
        return {};
      } catch {
        return { error: "Network error" };
      }
    },
    [],
  );

  return { secrets, isLoading, error, addSecret, deleteSecret, reload: load };
}
