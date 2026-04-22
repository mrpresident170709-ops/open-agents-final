import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { encrypt, decrypt, makeSecretAad, isLegacyCiphertext } from "@/lib/crypto";
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
 *
 * AAD note: every decrypt call passes (userId, name) as Additional Authenticated
 * Data. The GCM auth tag covers this context, so a row cannot be decrypted under
 * a different userId or different secret name without throwing.
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
      // Pass userId + name as AAD for v2 rows.
      // Legacy CBC rows ignore the AAD parameter.
      const aad = makeSecretAad({ userId: row.userId, name: row.name });
      const value = decrypt(row.encryptedValue, aad);

      if (row.environment === "all") {
        result[row.name] = value;
      } else {
        envSpecific[row.name] = value;
      }
    } catch (err) {
      console.error(
        `[user-secrets] failed to decrypt secret "${row.name}" (env: ${row.environment}, format: ${isLegacyCiphertext(row.encryptedValue) ? "legacy-cbc" : "v2-gcm"})`,
        err instanceof Error ? err.message : err,
      );
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
  // Always encrypt with GCM + AAD binding — this is the write path.
  // AAD binds the ciphertext to (userId, name) so it cannot be used under
  // a different user's record or a different key name.
  const aad = makeSecretAad({ userId, name });
  const encryptedValue = encrypt(value, aad);
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

// ─── Migration: CBC → GCM ─────────────────────────────────────────────────────

export interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; name: string; error: string }>;
}

/**
 * One-pass migration: re-encrypt all legacy AES-256-CBC secrets to AES-256-GCM.
 *
 * This is safe to call multiple times — rows already in GCM format are detected
 * via the `v2:` prefix and skipped without any DB writes.
 *
 * Run this once after deploying the GCM upgrade to ensure all stored secrets
 * gain authentication tags and AAD binding. After migration, the CBC code path
 * is never exercised on new data.
 */
export async function migrateSecretsToGcm(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Fetch every row (migration is a one-time background operation)
  const rows = await db.select().from(userSecrets);
  result.total = rows.length;

  for (const row of rows) {
    if (!isLegacyCiphertext(row.encryptedValue)) {
      result.skipped++;
      continue;
    }

    try {
      // Decrypt with the legacy CBC path (no AAD)
      const plaintext = decrypt(row.encryptedValue);

      // Re-encrypt with GCM + AAD bound to (userId, name)
      const aad = makeSecretAad({ userId: row.userId, name: row.name });
      const newCiphertext = encrypt(plaintext, aad);

      await db
        .update(userSecrets)
        .set({ encryptedValue: newCiphertext, updatedAt: new Date() })
        .where(eq(userSecrets.id, row.id));

      result.migrated++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        id: row.id,
        name: row.name,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(
        `[user-secrets] migration failed for secret "${row.name}" (id: ${row.id}):`,
        err,
      );
    }
  }

  if (result.migrated > 0 || result.failed > 0) {
    console.info(
      `[user-secrets] CBC→GCM migration complete: ` +
        `${result.migrated} migrated, ${result.skipped} already GCM, ${result.failed} failed`,
    );
  }

  return result;
}
