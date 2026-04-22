import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

const getEncryptionKey = (): Buffer | null => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;

  // Accept either a 64-char hex string (64 hex chars = 32 bytes)
  // or a base64-encoded string (44 chars = 32 bytes, the output of
  // `openssl rand -base64 32` which is the most common generation method).
  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    keyBuffer = Buffer.from(key, "hex");
  } else {
    keyBuffer = Buffer.from(key, "base64");
  }

  if (keyBuffer.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be a 32-byte value: either a 64-char hex string or a base64-encoded 32-byte key (e.g. from `openssl rand -base64 32`)",
    );
  }
  return keyBuffer;
};

export const encrypt = (text: string): string => {
  if (!text) return text;
  const ENCRYPTION_KEY = getEncryptionKey();
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return encryptedText;
  const ENCRYPTION_KEY = getEncryptionKey();
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  if (!encryptedText.includes(":")) {
    throw new Error("Invalid encrypted text format");
  }
  const [ivHex, encryptedHex] = encryptedText.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
