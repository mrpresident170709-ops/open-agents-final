/**
 * Encryption at rest — AES-256-GCM with HKDF key derivation and AAD binding
 *
 * Design decisions:
 *
 * 1. Algorithm: AES-256-GCM (AEAD)
 *    CBC has no authentication tag — an attacker with DB access can flip bits
 *    in the ciphertext without detection (padding oracle, bit-flip attacks).
 *    GCM adds a 128-bit authentication tag that makes any tampering detectable.
 *
 * 2. Key derivation: HKDF-SHA-256
 *    The raw ENCRYPTION_KEY is used as HKDF input material, not directly as the
 *    cipher key. This provides domain separation — the derived key is only ever
 *    used for this one purpose, and rotating to a new sub-purpose doesn't require
 *    changing the root key.
 *
 * 3. AAD (Additional Authenticated Data)
 *    Each ciphertext is bound to the context it was created in (e.g. userId + name).
 *    GCM auth tag covers both the ciphertext AND the AAD, so a ciphertext
 *    physically cannot be decrypted under a different user or different key name.
 *
 * 4. Format versioning
 *    v2: prefix → AES-256-GCM  (new path)
 *    no prefix  → AES-256-CBC  (legacy, read-only backward compat)
 *
 * 5. Wire format (v2)
 *    "v2:<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 *    All fields base64-encoded for compactness (vs hex of the old format).
 */

import crypto from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const GCM_IV_LENGTH = 12;   // 96-bit nonce — recommended for AES-GCM
const GCM_TAG_LENGTH = 16;  // 128-bit auth tag
const V2_PREFIX = "v2:";

// HKDF info string scopes the derived key to "secrets encryption v2".
// If we ever change the cipher or key schedule, bump this to v3.
const HKDF_INFO = Buffer.from("open-harness-secrets-v2");

// ─── Key management ───────────────────────────────────────────────────────────

const getEncryptionKey = (): Buffer => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for secret encryption. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    keyBuffer = Buffer.from(raw, "hex");
  } else if (/^[A-Za-z0-9+/]{43}={0,1}$/.test(raw) || raw.length === 44) {
    keyBuffer = Buffer.from(raw, "base64");
  } else {
    throw new Error(
      "ENCRYPTION_KEY must be a 32-byte value encoded as 64 hex chars or 44 base64 chars. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY decoded to ${keyBuffer.length} bytes but 32 are required.`,
    );
  }

  return keyBuffer;
};

/**
 * Derive a 256-bit encryption subkey from the master ENCRYPTION_KEY using
 * HKDF-SHA-256. Domain separation ensures the subkey can only decrypt data
 * encrypted with the same HKDF info string.
 */
function deriveGcmKey(masterKey: Buffer): Buffer {
  // hkdfSync(digest, key, salt, info, length)
  // Empty salt → HKDF uses a zero-filled salt of the same length as the hash output.
  return Buffer.from(
    crypto.hkdfSync("sha256", masterKey, Buffer.alloc(0), HKDF_INFO, 32),
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic AAD buffer from a context object.
 * The buffer covers all fields so the ciphertext is bound to the exact context.
 *
 * Usage:
 *   const aad = makeSecretAad({ userId, name });
 *   const ct  = encrypt(value, aad);
 *   const v   = decrypt(ct, aad);   // same aad required
 */
export function makeSecretAad(context: {
  userId: string;
  name: string;
}): Buffer {
  // Stable encoding: "userId\0name" (NUL separator — NUL is never in either field)
  return Buffer.from(`${context.userId}\0${context.name}`, "utf8");
}

/**
 * Encrypt `text` with AES-256-GCM and return a versioned ciphertext string.
 *
 * @param text  The plaintext to encrypt (must not be empty — callers should
 *              validate non-empty before calling).
 * @param aad   Optional Additional Authenticated Data. If provided, the same
 *              buffer MUST be supplied to `decrypt()`. Use `makeSecretAad()`.
 */
export function encrypt(text: string, aad?: Buffer): string {
  if (!text) {
    throw new Error("Cannot encrypt empty value");
  }

  const masterKey = getEncryptionKey();
  const key = deriveGcmKey(masterKey);
  const iv = crypto.randomBytes(GCM_IV_LENGTH);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: GCM_TAG_LENGTH,
  });

  if (aad) {
    cipher.setAAD(aad, { plaintextLength: Buffer.byteLength(text, "utf8") });
  }

  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return (
    V2_PREFIX +
    iv.toString("base64") +
    ":" +
    authTag.toString("base64") +
    ":" +
    ciphertext.toString("base64")
  );
}

/**
 * Decrypt a ciphertext produced by `encrypt()`.
 *
 * Supports:
 *  - v2 format (AES-256-GCM with auth tag + optional AAD)
 *  - Legacy CBC format produced by the old `aes-256-cbc` implementation
 *    (no auth tag, no AAD — decrypts for backward compatibility only)
 *
 * @param encryptedText  The full ciphertext string as returned by `encrypt()`.
 * @param aad            Must match the AAD used during `encrypt()` for v2.
 *                       Ignored for legacy CBC values.
 * @throws If the authentication tag is invalid (v2) or the format is unrecognised.
 */
export function decrypt(encryptedText: string, aad?: Buffer): string {
  if (!encryptedText) {
    throw new Error("Cannot decrypt empty value");
  }

  if (encryptedText.startsWith(V2_PREFIX)) {
    return decryptGcm(encryptedText.slice(V2_PREFIX.length), aad);
  }

  return decryptCbcLegacy(encryptedText);
}

// ─── Internal implementations ─────────────────────────────────────────────────

function decryptGcm(body: string, aad?: Buffer): string {
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid v2 ciphertext format (expected iv:authTag:data)");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;

  const masterKey = getEncryptionKey();
  const key = deriveGcmKey(masterKey);

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  if (iv.length !== GCM_IV_LENGTH) {
    throw new Error(`Invalid GCM IV length: ${iv.length} (expected ${GCM_IV_LENGTH})`);
  }
  if (authTag.length !== GCM_TAG_LENGTH) {
    throw new Error(`Invalid GCM auth tag length: ${authTag.length} (expected ${GCM_TAG_LENGTH})`);
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: GCM_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  if (aad) {
    decipher.setAAD(aad);
  }

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    // GCM auth failure — ciphertext was tampered with or wrong AAD was supplied.
    throw new Error(
      "Secret decryption failed: authentication tag mismatch. " +
        "The ciphertext may have been tampered with, or the wrong encryption context was used.",
    );
  }
}

/**
 * Legacy AES-256-CBC decrypt.
 *
 * Used ONLY for reading values encrypted by the old implementation.
 * New values are NEVER encrypted with CBC — use `encrypt()` which produces GCM.
 *
 * Format: "<iv_hex>:<ciphertext_hex>"
 */
function decryptCbcLegacy(encryptedText: string): string {
  const masterKey = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error(
      "Invalid legacy CBC ciphertext format (expected iv_hex:data_hex)",
    );
  }
  const [ivHex, encryptedHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", masterKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Returns true when a stored value uses the legacy CBC format (no auth tag).
 * Used by the migration utility to identify rows that need re-encryption.
 */
export function isLegacyCiphertext(encryptedValue: string): boolean {
  return !encryptedValue.startsWith(V2_PREFIX);
}
