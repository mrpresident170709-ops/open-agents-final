import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

const getEncryptionKey = (): Buffer | null => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;

  // Support both hex (64 chars = 32 bytes) and base64 (44 chars = 32 bytes)
  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    keyBuffer = Buffer.from(key, "hex");
  } else {
    keyBuffer = Buffer.from(key, "base64");
  }

  if (keyBuffer.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be a 32-byte value: either 64 hex chars or 44 base64 chars",
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
