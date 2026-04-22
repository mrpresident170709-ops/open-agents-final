import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { encrypt, decrypt } from "@/lib/crypto";
import { db } from "./client";
import { userSecrets, type UserSecret } from "./schema";

export interface SecretEntry {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function toSecretEntry(row: UserSecret): SecretEntry {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserSecrets(userId: string): Promise<SecretEntry[]> {
  const rows = await db
    .select()
    .from(userSecrets)
    .where(eq(userSecrets.userId, userId))
    .orderBy(userSecrets.name);
  return rows.map(toSecretEntry);
}

export async function getUserSecretNames(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: userSecrets.name })
    .from(userSecrets)
    .where(eq(userSecrets.userId, userId))
    .orderBy(userSecrets.name);
  return rows.map((r) => r.name);
}

export async function getUserSecretsDecrypted(
  userId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(userSecrets)
    .where(eq(userSecrets.userId, userId));

  const result: Record<string, string> = {};
  for (const row of rows) {
    try {
      result[row.name] = decrypt(row.encryptedValue);
    } catch {
      // Skip secrets that fail to decrypt rather than crashing the whole request
      console.error(`[user-secrets] failed to decrypt secret ${row.name}`);
    }
  }
  return result;
}

export async function upsertUserSecret(
  userId: string,
  name: string,
  value: string,
): Promise<SecretEntry> {
  const encryptedValue = encrypt(value);
  const now = new Date();

  const [existing] = await db
    .select({ id: userSecrets.id })
    .from(userSecrets)
    .where(and(eq(userSecrets.userId, userId), eq(userSecrets.name, name)))
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
): Promise<boolean> {
  const result = await db
    .delete(userSecrets)
    .where(and(eq(userSecrets.userId, userId), eq(userSecrets.name, name)))
    .returning({ id: userSecrets.id });
  return result.length > 0;
}
