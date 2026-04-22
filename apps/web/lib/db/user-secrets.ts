import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { encrypt, decrypt } from "@/lib/crypto";
import { db } from "./client";
import {
  userSecrets,
  type UserSecret,
  type SecretEnvironment,
  SECRET_ENVIRONMENTS,
} from "./schema";

export type { SecretEnvironment };
export { SECRET_ENVIRONMENTS };

export interface SecretEntry {
  id: string;
  name: string;
  environment: SecretEnvironment;
  createdAt: Date;
  updatedAt: Date;
}

function toSecretEntry(row: UserSecret): SecretEntry {
  const env = SECRET_ENVIRONMENTS.includes(row.environment as SecretEnvironment)
    ? (row.environment as SecretEnvironment)
    : "all";
  return {
    id: row.id,
    name: row.name,
    environment: env,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Return all secrets for a user, optionally filtered by environment.
 * Passing no environment returns all secrets across all environments.
 */
export async function getUserSecrets(
  userId: string,
  environment?: SecretEnvironment,
): Promise<SecretEntry[]> {
  const where = environment
    ? and(eq(userSecrets.userId, userId), eq(userSecrets.environment, environment))
    : eq(userSecrets.userId, userId);

  const rows = await db
    .select()
    .from(userSecrets)
    .where(where)
    .orderBy(userSecrets.environment, userSecrets.name);

  return rows.map(toSecretEntry);
}

/**
 * Return the names of secrets visible in a given environment.
 * Includes 'all' secrets + environment-specific secrets.
 * If no environment is specified, returns all secret names across all envs (deduplicated).
 */
export async function getUserSecretNames(
  userId: string,
  environment?: SecretEnvironment,
): Promise<string[]> {
  const envFilter =
    environment && environment !== "all"
      ? inArray(userSecrets.environment, ["all", environment])
      : eq(userSecrets.userId, userId);

  const whereClause =
    environment && environment !== "all"
      ? and(eq(userSecrets.userId, userId), envFilter)
      : eq(userSecrets.userId, userId);

  const rows = await db
    .select({ name: userSecrets.name })
    .from(userSecrets)
    .where(whereClause)
    .orderBy(userSecrets.name);

  // Deduplicate — same key may exist in 'all' and env-specific
  return [...new Set(rows.map((r) => r.name))];
}

/**
 * Decrypt and return secrets that should be injected for a given environment.
 *
 * Merging rules (mirrors how a vault resolves env-specific overrides):
 *  1. Start with 'all' secrets (available everywhere)
 *  2. Overlay env-specific secrets — they take precedence over 'all'
 *
 * If no environment is specified, returns all secrets without merging.
 */
export async function getUserSecretsDecrypted(
  userId: string,
  environment?: SecretEnvironment,
): Promise<Record<string, string>> {
  let rows: UserSecret[];

  if (environment && environment !== "all") {
    rows = await db
      .select()
      .from(userSecrets)
      .where(
        and(
          eq(userSecrets.userId, userId),
          inArray(userSecrets.environment, ["all", environment]),
        ),
      );
  } else {
    rows = await db
      .select()
      .from(userSecrets)
      .where(eq(userSecrets.userId, userId));
  }

  // First pass: collect 'all' secrets
  const result: Record<string, string> = {};
  const envSpecific: Record<string, string> = {};

  for (const row of rows) {
    try {
      const value = decrypt(row.encryptedValue);
      if (row.environment === "all") {
        result[row.name] = value;
      } else {
        envSpecific[row.name] = value;
      }
    } catch {
      console.error(`[user-secrets] failed to decrypt secret ${row.name} (${row.environment})`);
    }
  }

  // Second pass: env-specific overrides 'all' for the same key
  return { ...result, ...envSpecific };
}

export async function upsertUserSecret(
  userId: string,
  name: string,
  value: string,
  environment: SecretEnvironment = "all",
): Promise<SecretEntry> {
  const encryptedValue = encrypt(value);
  const now = new Date();

  const [existing] = await db
    .select({ id: userSecrets.id })
    .from(userSecrets)
    .where(
      and(
        eq(userSecrets.userId, userId),
        eq(userSecrets.name, name),
        eq(userSecrets.environment, environment),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(userSecrets)
      .set({ encryptedValue, updatedAt: now })
      .where(eq(userSecrets.id, existing.id))
      .returning();
    return toSecretEntry(updated);
  }

  const [created] = await db
    .insert(userSecrets)
    .values({
      id: nanoid(),
      userId,
      name,
      environment,
      encryptedValue,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return toSecretEntry(created);
}

export async function deleteUserSecret(
  userId: string,
  name: string,
  environment: SecretEnvironment = "all",
): Promise<boolean> {
  const result = await db
    .delete(userSecrets)
    .where(
      and(
        eq(userSecrets.userId, userId),
        eq(userSecrets.name, name),
        eq(userSecrets.environment, environment),
      ),
    )
    .returning({ id: userSecrets.id });
  return result.length > 0;
}
